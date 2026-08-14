import { getTenantDb } from "@/db/db";
import { sale, saleItem } from "@/db/schema/tenant/sale"
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { createBulkStockMovements } from "../stock/StockService";
import { cash } from "@/db/schema/tenant";
import { AppError } from "../../../utils/errors";

const GENERIC_PRODUCT_ID = 0

export async function getSales(tenantSlug: string, includeDeleted?: boolean) {
    const db = getTenantDb(tenantSlug)
    const conditions = []
    if (!includeDeleted) {
        conditions.push(isNull(sale.deletedAt))
    }

    const sales = await db.query.sale.findMany({
        columns: {
            id: true,
            createdAt: true,
            settledAt: true,
            totalAmount: true
        },
        where: includeDeleted
            ? undefined
            : (sale, { isNull }) =>
                isNull(sale.deletedAt),
        orderBy: [desc(sale.createdAt)],
        with: {
            client: {
                columns: {
                    id: true,
                    name: true
                }
            },
            payment: {
                columns: {
                    id: true,
                    amount: true,
                    status: true,
                    paymentMethod: true,
                    paidAt: true,
                }
            },
            saleItem: {
                columns: {
                    quantity: true,
                    totalPrice: true
                },
                where: (saleItem, { isNull }) =>
                    isNull(saleItem.deletedAt),
                with: {
                    product: {
                        columns: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    })

    return sales

}

export async function currentSale(tenantSlug: string, includeDeleted?: boolean) {
    const db = getTenantDb(tenantSlug)

    const currentSale = await db.query.sale.findFirst({
        orderBy: [desc(sale.createdAt)],
        columns: {
            id: true,
            createdAt: true,
            updatedAt: true
        },
        with: {
            client: {
                columns: {
                    id: true,
                    name: true
                }
            },
            payment: {
                columns: {
                    amount: true
                }
            },
            saleItem: {
                columns: {
                    id: true,
                    saleId: true,
                    productId: true,
                    quantity: true,
                    totalPrice: true,
                    unitPrice: true,
                    createdAt: true,
                    discount: true,
                    deletedAt: true,
                    deleteReason: true,
                },
                orderBy: [desc(saleItem.createdAt)],
                where: includeDeleted
                    ? undefined
                    : (saleItem, { isNull }) =>
                        isNull(saleItem.deletedAt),
                with: {
                    product: {
                        columns: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        },
        where: (sale, { isNull }) =>
            isNull(sale.settledAt)
    })

    if (!currentSale) return null

    return currentSale
}

export async function createSale(tenantSlug: string, data: {
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { userId } = data

    const [newSale] = await db.insert(sale).values({
        createdByUserId: userId,
    }).returning()

    return newSale
}

export async function updateSaleClient(tenantSlug: string, data: {
    userId: string,
    clientId: number,
    saleId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { userId, clientId, saleId } = data

    const updated = await db.update(sale).set({
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedByUserId: userId,
        clientId,
    })
        .where(eq(sale.id, saleId))
        .returning()

    return updated
}

export async function settleSale(tenantSlug: string, data: {
    saleId: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { userId, saleId } = data

    const settlement = await db.transaction(async (tx) => {

        const currentCash = await tx.query.cash.findFirst({
            orderBy: [desc(cash.createdAt)],
            columns: {
                id: true
            },
            where: (cash, { isNull }) =>
                isNull(cash.closedAt)
        })

        if (!currentCash) throw new AppError("o caixa precisa estar aberto para finalizar uma venda", 409, "CASH_NOT_OPEN")

        const selectedSale = await tx.query.sale.findFirst({
            orderBy: [desc(sale.createdAt)],
            where: (sale, { and, eq, isNull }) =>
                and(
                    isNull(sale.settledAt),
                    eq(sale.id, saleId)
                ),
            columns: {
                id: true,
            }
        })

        if (!selectedSale) throw new AppError("venda não encontrada", 404, "SALE_NOT_FOUND")

        const saleItems = await tx.query.saleItem.findMany({
            where: (saleItem, { and, eq, isNull }) =>
                and(
                    eq(saleItem.saleId, selectedSale.id),
                    isNull(saleItem.deletedAt)
                )
        })

        const totalAmount = saleItems.reduce((acc, item) => acc + item.totalPrice - (item.discount ?? 0), 0)
        const stockSaleItems = saleItems.filter((item) => item.productId !== GENERIC_PRODUCT_ID)

        if (stockSaleItems.length > 0) {
            await createBulkStockMovements(
                tenantSlug,
                stockSaleItems.map((s) => ({
                    productId: s.productId,
                    quantity: s.quantity,
                    type: "out",
                    reason: "venda realizada",
                    userId,
                    referenceType: "sale",
                    referenceId: s.saleId
                }))
            )
        }

        await tx.update(sale).set({
            totalAmount,
            settledAt: sql`(CURRENT_TIMESTAMP)`,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            cashId: currentCash.id,
            updatedByUserId: userId
        })
            .where(eq(sale.id, selectedSale.id))
            .returning()

        return currentCash.id

    })

    return settlement
}

export async function addProductToSale(tenantSlug: string, data: {
    productId: number,
    quantity: number,
    discount: number,
    unitPrice?: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)

    const { productId, quantity, userId, discount, unitPrice } = data
    const saleId = await currentSale(tenantSlug)

    if (!saleId) throw new AppError("venda é obrigatória para adicionar produtos", 409, "SALE_REQUIRED")
    if (quantity < 1) throw new AppError("quantidade deve ser maior que 0", 400, "INVALID_QUANTITY")

    const saleProduct = await db.query.product.findFirst({
        where: (product, { eq }) => eq(product.id, productId),
        columns: {
            sellPrice: true
        }
    })

    if (!saleProduct) throw new AppError("produto não encontrado", 404, "PRODUCT_NOT_FOUND")

    if (productId === GENERIC_PRODUCT_ID && (!unitPrice || unitPrice < 1)) {
        throw new AppError("valor de venda deve ser maior que 0", 400, "INVALID_SALE_PRICE")
    }

    const itemUnitPrice = productId === GENERIC_PRODUCT_ID ? unitPrice ?? 0 : saleProduct.sellPrice

    const [newSaleItem] = await db.insert(saleItem).values({
        saleId: saleId.id,
        productId,
        quantity,
        unitPrice: itemUnitPrice,
        totalPrice: quantity * itemUnitPrice,
        discount,
        createdByUserId: userId,
        updatedByUserId: userId
    })
        .returning()

    return newSaleItem
}

export async function updateSaleItem(tenantSlug: string, data: {
    saleItemId: string,
    quantity: number,
    discount: number,
    unitPrice?: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { saleItemId, quantity, discount, unitPrice, userId } = data

    if (quantity < 1) throw new AppError("quantidade deve ser maior que 0", 400, "INVALID_QUANTITY")

    const activeSale = await currentSale(tenantSlug)
    if (!activeSale) throw new AppError("venda é obrigatória para editar produtos", 409, "SALE_REQUIRED")

    const selectedSaleItem = await db.query.saleItem.findFirst({
        where: (saleItem, { and, eq, isNull }) =>
            and(
                eq(saleItem.id, saleItemId),
                eq(saleItem.saleId, activeSale.id),
                isNull(saleItem.deletedAt)
            ),
        columns: {
            id: true,
            productId: true,
            unitPrice: true
        }
    })

    if (!selectedSaleItem) throw new AppError("item da venda não encontrado", 404, "SALE_ITEM_NOT_FOUND")

    if (selectedSaleItem.productId === GENERIC_PRODUCT_ID && unitPrice !== undefined && unitPrice < 1) {
        throw new AppError("valor de venda deve ser maior que 0", 400, "INVALID_SALE_PRICE")
    }

    const itemUnitPrice = selectedSaleItem.productId === GENERIC_PRODUCT_ID && unitPrice !== undefined
        ? unitPrice
        : selectedSaleItem.unitPrice

    const [updatedSaleItem] = await db.update(saleItem).set({
        quantity,
        discount,
        unitPrice: itemUnitPrice,
        totalPrice: itemUnitPrice * quantity,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedByUserId: userId
    })
        .where(and(
            eq(saleItem.id, selectedSaleItem.id),
            eq(saleItem.saleId, activeSale.id),
            isNull(saleItem.deletedAt)
        ))
        .returning()

    return updatedSaleItem
}

export async function removeProductFromSale(tenantSlug: string, data: {
    saleItemId: string,
    userId: string,
    deleteReason: string
}) {
    const db = getTenantDb(tenantSlug)

    const { saleItemId, userId, deleteReason } = data

    const [deleted] = await db.update(saleItem).set({
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedByUserId: userId,
        deletedByUserId: userId,
        deleteReason
    })
        .where(and(
            eq(saleItem.id, saleItemId),
            isNull(saleItem.deletedAt)
        ))
        .returning()

    if (!deleted) throw new AppError("item da venda não encontrado", 404, "SALE_ITEM_NOT_FOUND")

    return deleted
}

export async function reactivateProductFromSale(tenantSlug: string, data: {
    saleItemId: string,
    userId: string,
}) {
    const db = getTenantDb(tenantSlug)

    const { saleItemId, userId } = data

    const [reactivated] = await db.update(saleItem).set({
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedAt: null,
        updatedByUserId: userId,
        deletedByUserId: null,
        deleteReason: null,
    })
        .where(and(
            eq(saleItem.id, saleItemId),
            isNotNull(saleItem.deletedAt)
        ))
        .returning()

    if (!reactivated) throw new AppError("item da venda excluído não encontrado", 404, "DELETED_SALE_ITEM_NOT_FOUND")

    return reactivated
}

export async function cancelSale(tenantSlug: string, data: {
    saleId: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { saleId, userId } = data

    const transaction = await db.transaction(async (tx) => {
        const selectedSale = await tx.query.sale.findFirst({
            where: (sale, { and, eq, isNull }) =>
                and(
                    eq(sale.id, saleId),
                    isNull(sale.settledAt),
                    isNull(sale.cancelledAt),
                    isNull(sale.deletedAt),
                ),
            columns: { id: true },
        })

        if (!selectedSale) {
            throw new AppError("venda não encontrada", 404, "SALE_NOT_FOUND")
        }

        const paidPayments = await tx.query.payment.findMany({
            where: (payment, { and, eq }) =>
                and(
                    eq(payment.saleId, saleId),
                    eq(payment.status, "paid"),
                ),
            columns: { id: true },
        })

        if (paidPayments.length > 0) {
            throw new AppError("estorne os pagamentos antes de cancelar a venda", 409, "SALE_HAS_PAID_PAYMENTS")
        }

        await tx.update(sale).set({
            cancelledAt: sql`(CURRENT_TIMESTAMP)`,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedByUserId: userId,
            deletedAt: sql`(CURRENT_TIMESTAMP)`,
            deletedByUserId: userId,
        })
            .where(eq(sale.id, selectedSale.id))

        return { ok: true, saleId: selectedSale.id }
    })

    return transaction
}

import { getTenantDb } from "@/db/db";
import { sale, saleItem } from "@/db/schema/tenant/sale"
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { createBulkStockMovements } from "../stock/StockService";
import { currentCash } from "../cash/CashService";

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
                    amount: true
                }
            },
            saleItem: {
                columns: {
                    quantity: true,
                    totalPrice: true
                },
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

export async function currentSale(tenantSlug: string) {
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
                    discount: true
                },
                orderBy: [desc(saleItem.createdAt)],
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

    const cashId = await currentCash(tenantSlug)

    if (!cashId) throw new Error("o caixa deve estar aberto para iniciar uma nova venda")

    const [newSale] = await db.insert(sale).values({
        cashId: cashId?.id,
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

        const selectedSale = await tx.query.sale.findFirst({
            orderBy: [desc(sale.createdAt)],
            where: (sale, { and, eq, isNull }) =>
                and(
                    isNull(sale.settledAt),
                    eq(sale.id, saleId)
                ),
            columns: {
                id: true,
                cashId: true
            }
        })

        if (!selectedSale) throw new Error("venda não encontrada")

        const saleItems = await tx.query.saleItem.findMany({
            where: (saleItem, { eq }) =>
                eq(saleItem.saleId, selectedSale.id)
        })

        const totalAmount = saleItems.reduce((acc, value) => acc + (value.unitPrice * value.quantity), 0)

        await createBulkStockMovements(
            tenantSlug,
            saleItems.map((s) => ({
                productId: s.productId,
                quantity: s.quantity,
                type: "out",
                reason: "venda realizada",
                userId,
                referenceType: "sale",
                referenceId: s.saleId
            }))
        )

        await tx.update(sale).set({
            totalAmount,
            settledAt: sql`(CURRENT_TIMESTAMP)`,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedByUserId: userId
        })
            .where(eq(sale.id, selectedSale.id))
            .returning()

    })

    return settlement
}

export async function addProductToSale(tenantSlug: string, data: {
    productId: number,
    quantity: number,
    discount: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)

    const { productId, quantity, userId, discount } = data
    const saleId = await currentSale(tenantSlug)

    if (!saleId) throw new Error("venda é obrigatória para adicionar produtos")

    const saleProduct = await db.query.product.findFirst({
        where: (product, { eq }) => eq(product.id, productId),
        columns: {
            sellPrice: true
        }
    })

    if (!saleProduct) throw new Error("produto não encontrado")

    const [newSaleItem] = await db.insert(saleItem).values({
        saleId: saleId.id,
        productId,
        quantity,
        unitPrice: saleProduct.sellPrice,
        totalPrice: quantity * saleProduct.sellPrice,
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
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { saleItemId, quantity, discount, userId } = data

    if (quantity < 1) throw new Error("quantidade deve ser maior que 0")

    const activeSale = await currentSale(tenantSlug)
    if (!activeSale) throw new Error("venda é obrigatória para editar produtos")

    const selectedSaleItem = await db.query.saleItem.findFirst({
        where: (saleItem, { and, eq, isNull }) =>
            and(
                eq(saleItem.id, saleItemId),
                eq(saleItem.saleId, activeSale.id),
                isNull(saleItem.deletedAt)
            ),
        columns: {
            id: true,
            unitPrice: true
        }
    })

    if (!selectedSaleItem) throw new Error("item da venda não encontrado")

    const [updatedSaleItem] = await db.update(saleItem).set({
        quantity,
        discount,
        totalPrice: selectedSaleItem.unitPrice * quantity,
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
        .where(eq(saleItem.id, saleItemId))
        .returning()

    return deleted
}

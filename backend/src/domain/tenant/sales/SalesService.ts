import { getTenantDb } from "@/db/db";
import { sale, saleItem } from "@/db/schema/tenant/sale"
import { desc, eq, sql } from "drizzle-orm";
import { createBulkStockMovements } from "../stock/StockService";
import { createCashMovement } from "../cash/CashService";
import { cash } from "@/db/schema/tenant";

export async function currentSale(tenantSlug: string) {
    const db = getTenantDb(tenantSlug)

    const currentSale = await db.query.sale.findFirst({
        orderBy: [desc(sale.createdAt)],
        where: (sale, { isNotNull }) =>
            isNotNull(sale.settledAt)
    })

    if (!currentSale) return null

    return currentSale
}

export async function createSale(tenantSlug: string, data: {
    clientId: number
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { clientId, userId } = data

    const [newSale] = await db.insert(sale).values({
        clientId,
        createdByUserId: userId,
    }).returning()

    return newSale
}

export async function settleSale(tenantSlug: string, data: {
    saleId: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { userId, saleId } = data

    const settlement = db.transaction(async (tx) => {
        const currentSale = await tx.query.sale.findFirst({
            where: (sale, { eq }) => eq(sale.id, saleId)
        })

        if (!currentSale) throw new Error("venda não encontrada no sistema")

        const saleItems = await tx.query.saleItem.findMany({
            where: (saleItem, { eq }) =>
                eq(saleItem.saleId, currentSale.id)
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

        const currentCash = await tx.query.cash.findFirst({
            orderBy: [desc(cash.createdAt)],
            where: (cash, { isNull }) =>
                isNull(cash.closedAt),
            columns: {
                id: true
            }
        })

        if (!currentCash) throw new Error("o caixa deve ser aberto para a realização de vendas")

        await createCashMovement(tenantSlug, {
            cashId: currentCash.id,
            amount: totalAmount,
            nature: "in",
            type: "sale",
            userId,
            description: "venda realizada",
            referenceType: "sale",
            referenceId: currentSale.id
        })

        await tx.update(sale).set({
            totalAmount,
            settledAt: sql`(CURRENT_TIMESTAMP)`,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedByUserId: userId
        })
            .where(eq(sale.id, saleId))
            .returning()

    })

    return settlement
}

export async function addProductToSale(tenantSlug: string, data: {
    saleId: string,
    productId: number,
    quantity: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)

    const { saleId, productId, quantity, userId } = data

    const saleProduct = await db.query.product.findFirst({
        where: (product, { eq }) => eq(product.id, productId),
        columns: {
            sellPrice: true
        }
    })

    if (!saleProduct) throw new Error("produto não encontrado")

    const [newSaleItem] = await db.insert(saleItem).values({
        saleId,
        productId,
        quantity,
        unitPrice: saleProduct.sellPrice,
        totalPrice: quantity * saleProduct.sellPrice,
        createdByUserId: userId,
        updatedByUserId: userId
    })
        .returning()

    return newSaleItem
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

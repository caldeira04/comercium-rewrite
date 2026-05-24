import { getTenantDb } from "@/db/db";
import { product, stockMovement } from "@/db/schema/tenant";
import { asc, eq, isNull, sql } from "drizzle-orm";

export async function createStockMovement(tenantSlug: string, data: {
    productId: number
    type: "in" | "out" | "adjustment" | "transfer"
    quantity: number
    reason?: string
    referenceType?: "sale" | "purchase" | "refund" | "manual"
    referenceId?: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { productId, type, quantity, reason, referenceType, referenceId, userId } = data

    const [newStockMovement] = await db.insert(stockMovement).values({
        productId,
        type,
        quantity,
        reason,
        referenceType,
        referenceId,
        createdByUserId: userId,
        updatedByUserId: userId
    }).returning()

    return newStockMovement
}

export async function createBulkStockMovements(tenantSlug: string, data: {
    productId: number
    type: "in" | "out" | "adjustment" | "transfer"
    quantity: number
    reason?: string
    referenceType?: "sale" | "purchase" | "refund" | "manual"
    referenceId?: string
    userId: string
}[]) {
    const db = getTenantDb(tenantSlug)

    const [newStockMovements] = await db.insert(stockMovement).values(data.map((m) => ({
        productId: m.productId,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        createdByUserId: m.userId,
        updatedByUserId: m.userId
    }))).returning()

    return newStockMovements
}

export async function getStockMovements(tenantSlug: string, products: string[], includeDeleted?: boolean) {

    const db = getTenantDb(tenantSlug)
    const conditions = []

    if (!includeDeleted) {
        conditions.push(isNull(product.deletedAt))
    }

    const stockMovements = await db.query.stockMovement.findMany({
        columns: {
            id: true,
            quantity: true,
            type: true,
            reason: true,
            referenceType: true,
            referenceId: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            createdByUserId: true,
            updatedByUserId: true,
            deletedByUserId: true,
        },
        with: products.length > 0
            ? {
                product: {
                    columns: {
                        id: true,
                        name: true
                    }
                }
            } : undefined,

        where: includeDeleted
            ? undefined
            : (product, { and, isNull }) =>
                and(
                    isNull(product.deletedAt)
                ),

        orderBy: [asc(stockMovement.createdAt)],

    })

    return stockMovements
}

export async function deleteStockMovements(tenantSlug: string, stockMovementId: string, userId: string) {
    const db = getTenantDb(tenantSlug)

    const deleted = await db.update(stockMovement).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedByUserId: userId
    })
        .where(eq(stockMovement.id, stockMovementId))
        .returning({ deleted_at: stockMovement.deletedAt })

    if (!deleted) return { ok: false }
    return { ok: true }
}

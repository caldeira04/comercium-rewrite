import { getTenantDb } from "@/db/db";
import { product } from "@/db/schema/tenant/product"
import { asc, eq, isNull, sql } from "drizzle-orm";

export async function createProduct(tenantSlug: string, data: {
    name: string
    buyPrice: number
    sellPrice: number
    gtin?: string
    createdByUserId?: string | null
}) {
    const db = getTenantDb(tenantSlug)
    const { name, buyPrice, sellPrice, gtin, createdByUserId } = data

    const [newProduct] = await db.insert(product).values({
        name,
        buyPrice,
        sellPrice,
        gtin: gtin ?? null,
        createdByUserId,
        updatedByUserId: createdByUserId
    }).returning()

    return newProduct
}

export async function getProducts(tenantSlug: string, includeDeleted?: boolean) {
    const db = getTenantDb(tenantSlug)
    const conditions = []
    if (!includeDeleted) {
        conditions.push(isNull(product.deletedAt))
    }

    const products = await db
        .select({
            id: product.id,
            name: product.name,
            sellPrice: product.sellPrice,
            buyPrice: product.buyPrice,
            gtin: product.gtin,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            deletedAt: product.deletedAt,
            createdByUserId: product.createdByUserId,
            updatedByUserId: product.updatedByUserId,
            deletedByUserId: product.deletedByUserId,
        })
        .from(product)
        .where(conditions.length ? conditions[0] : undefined)
        .orderBy(asc(product.createdAt))

    return products
}

export async function deleteProduct(tenantSlug: string, productId: number, userId: string) {
    const db = getTenantDb(tenantSlug)

    const deleted = await db.update(product).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedByUserId: userId
    })
        .where(eq(product.id, productId))
        .returning({ deleted_at: product.deletedAt })

    if (!deleted) return { ok: false }
    return { ok: true }
}

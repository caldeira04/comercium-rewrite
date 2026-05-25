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
        .query.product.findMany({
            columns: {
                id: true,
                name: true,
                sellPrice: true,
                buyPrice: true,
                gtin: true,
            },
            with: {
                stockMovement: {
                    columns: {
                        quantity: true,
                        type: true
                    }
                }
            },
            where: includeDeleted
                ? undefined
                : (product, { isNull }) =>
                    isNull(product.deletedAt),
            orderBy: [asc(product.id)]
        })

    return products
}

export async function getSingleProduct(tenantSlug: string, productId: number) {
    const db = getTenantDb(tenantSlug)

    const product = await db
        .query.product.findFirst({
            columns: {
                id: true,
                name: true,
                sellPrice: true,
                buyPrice: true,
                gtin: true,
            },
            with: {
                stockMovement: {
                    columns: {
                        quantity: true,
                        type: true
                    }
                }
            },
            where: (product, { eq }) =>
                eq(product.id, productId),
        })

    return product
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

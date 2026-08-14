import { getTenantDb } from "@/db/db";
import { category } from "@/db/schema/tenant";
import { AppError } from "../../../utils/errors";
import { asc, eq, sql } from "drizzle-orm";

export async function getCategories(tenantSlug: string, includeDeleted?: boolean) {
    const db = getTenantDb(tenantSlug)

    return await db.query.category.findMany({
        columns: {
            id: true,
            name: true,
        },
        where: includeDeleted
            ? undefined
            : (category, { isNull }) =>
                isNull(category.deletedAt),
        orderBy: [asc(category.name)],
    })
}

export async function createCategory(tenantSlug: string, data: {
    name: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)

    const [newCategory] = await db.insert(category).values({
        name: data.name,
        createdByUserId: data.userId,
        updatedByUserId: data.userId,
    }).returning()

    return newCategory
}

export async function updateCategory(tenantSlug: string, data: {
    categoryId: number
    name: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)

    const [updated] = await db.update(category).set({
        name: data.name,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedByUserId: data.userId,
    })
        .where(eq(category.id, data.categoryId))
        .returning()

    if (!updated) throw new AppError("categoria não encontrada", 404, "CATEGORY_NOT_FOUND")

    return updated
}

export async function deleteCategory(tenantSlug: string, categoryId: number, userId: string) {
    const db = getTenantDb(tenantSlug)

    const [deleted] = await db.update(category).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedByUserId: userId,
    })
        .where(eq(category.id, categoryId))
        .returning({ deleted_at: category.deletedAt })

    if (!deleted) throw new AppError("categoria não encontrada", 404, "CATEGORY_NOT_FOUND")

    return { ok: true }
}
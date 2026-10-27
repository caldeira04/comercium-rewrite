import { getTenantDb } from "@/db/db"
import { expenseCategory } from "@/db/schema/tenant"
import { and, asc, eq, isNull } from "drizzle-orm"
import { AppError } from "../../../utils/errors"

function normalizeName(name?: string) {
    const value = name?.trim()

    if (!value) {
        throw new AppError("informe o nome da categoria", 400, "INVALID_CATEGORY_NAME")
    }

    return value
}

export async function getExpenseCategories(tenantSlug: string, options: { includeDeleted?: boolean } = {}) {
    const db = getTenantDb(tenantSlug)

    return await db
        .select({
            id: expenseCategory.id,
            name: expenseCategory.name,
            deletedAt: expenseCategory.deletedAt,
        })
        .from(expenseCategory)
        .where(options.includeDeleted ? undefined : isNull(expenseCategory.deletedAt))
        .orderBy(asc(expenseCategory.name))
}

export async function createExpenseCategory(tenantSlug: string, data: {
    name: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const name = normalizeName(data.name)

    const existing = await db.query.expenseCategory.findFirst({
        where: (expenseCategory, { eq }) => eq(expenseCategory.name, name),
    })

    if (existing) {
        if (existing.deletedAt) {
            const [restored] = await db.update(expenseCategory).set({
                deletedAt: null,
                deletedByUserId: null,
                updatedByUserId: data.userId,
            }).where(eq(expenseCategory.id, existing.id)).returning()

            return restored
        }

        throw new AppError("já existe uma categoria com esse nome", 409, "CATEGORY_ALREADY_EXISTS")
    }

    const [created] = await db.insert(expenseCategory).values({
        name,
        createdByUserId: data.userId,
        updatedByUserId: data.userId,
    }).returning()

    return created
}

export async function updateExpenseCategory(tenantSlug: string, data: {
    categoryId: string
    userId: string
    name: string
}) {
    const db = getTenantDb(tenantSlug)
    const name = normalizeName(data.name)

    const existing = await db.query.expenseCategory.findFirst({
        where: (expenseCategory, { and, eq, isNull }) =>
            and(eq(expenseCategory.id, data.categoryId), isNull(expenseCategory.deletedAt)),
    })

    if (!existing) {
        throw new AppError("categoria não encontrada", 404, "CATEGORY_NOT_FOUND")
    }

    const duplicated = await db.query.expenseCategory.findFirst({
        where: (expenseCategory, { and, eq, ne, isNull }) =>
            and(eq(expenseCategory.name, name), ne(expenseCategory.id, data.categoryId), isNull(expenseCategory.deletedAt)),
    })

    if (duplicated) {
        throw new AppError("já existe uma categoria com esse nome", 409, "CATEGORY_ALREADY_EXISTS")
    }

    const [updated] = await db.update(expenseCategory).set({
        name,
        updatedByUserId: data.userId,
    }).where(eq(expenseCategory.id, data.categoryId)).returning()

    return updated
}

export async function deleteExpenseCategory(tenantSlug: string, categoryId: string, userId: string) {
    const db = getTenantDb(tenantSlug)

    const [deleted] = await db.update(expenseCategory).set({
        deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        deletedByUserId: userId,
        updatedByUserId: userId,
    })
        .where(and(eq(expenseCategory.id, categoryId), isNull(expenseCategory.deletedAt)))
        .returning({ id: expenseCategory.id })

    if (!deleted) {
        throw new AppError("categoria não encontrada", 404, "CATEGORY_NOT_FOUND")
    }

    return { ok: true }
}

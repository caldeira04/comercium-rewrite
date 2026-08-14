import { db } from "@/db/db"
import { tenant } from "@/db/schema/master/tenant"
import { tenantUser } from "@/db/schema/master/auth"
import { hashPassword } from "../../utils/auth"
import { AppError } from "../../utils/errors"
import { asc, eq, sql } from "drizzle-orm"

export async function listTenants(
    includeDeleted?: boolean,
    includeUsers?: boolean
) {
    const tenants = await db.query.tenant.findMany({
        columns: {
            id: true,
            name: true,
            slug: true,
        },

        with: includeUsers
            ? {
                tenantUsers: {
                    columns: {
                        login: true,
                    },
                },
            }
            : undefined,

        where: includeDeleted
            ? undefined
            : (tenant, { and, eq, isNull }) =>
                and(
                    eq(tenant.isActive, true),
                    isNull(tenant.deletedAt)
                ),

        orderBy: [asc(tenant.createdAt)],
    })

    return tenants
}

export async function getTenant(tenantId: string) {
    const tenantRow = await db.query.tenant.findFirst({
        where: (tenant, { eq }) =>
            eq(tenant.id, tenantId),
    })

    if (!tenantRow) throw new AppError("loja não encontrada", 404, "TENANT_NOT_FOUND")

    return tenantRow
}

export async function updateTenant(tenantId: string, data: Partial<{
    name: string
    legalName: string
    document: string
    email: string
    phone: string
    zipcode: string
    street: string
    state: string
    district: string
    city: string
    number: string
    country: string
    logoUrl: string
    primaryColor: string
    timezone: string
    currency: string
}>) {
    const [updated] = await db.update(tenant)
        .set(data)
        .where(eq(tenant.id, tenantId))
        .returning()

    if (!updated) throw new AppError("loja não encontrada", 404, "TENANT_NOT_FOUND")

    return updated
}

export async function deleteTenant(tenantId: string) {
    const deleted = await db.update(tenant).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`
    })
        .where(eq(tenant.id, tenantId))
        .returning({ deleted_at: tenant.deletedAt })

    if (!deleted) return { ok: false }
    return { ok: true }
}

export async function listTenantUsers(tenantId: string) {
    return await db.query.tenantUser.findMany({
        columns: {
            id: true,
            login: true,
            createdAt: true,
        },
        where: (tenantUser, { eq }) =>
            eq(tenantUser.tenantId, tenantId),
        orderBy: [asc(tenantUser.createdAt)],
    })
}

export async function createTenantUser(tenantId: string, data: {
    login: string
    password: string
}) {
    const [newUser] = await db.insert(tenantUser).values({
        tenantId,
        login: data.login,
        password: await hashPassword(data.password),
    }).returning({ id: tenantUser.id, login: tenantUser.login })

    return newUser
}

export async function deleteTenantUser(userId: string, currentUserId: string) {
    if (userId === currentUserId) {
        throw new AppError("não é possível remover o próprio usuário", 400, "CANNOT_DELETE_SELF")
    }

    const deleted = await db.delete(tenantUser)
        .where(eq(tenantUser.id, userId))
        .returning({ id: tenantUser.id })

    if (!deleted) throw new AppError("usuário não encontrado", 404, "USER_NOT_FOUND")

    return { ok: true }
}
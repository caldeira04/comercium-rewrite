import { db } from "@/db/db"
import { tenant } from "@/db/schema/master/tenant"
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
export async function deleteTenant(tenantId: string) {
    const deleted = await db.update(tenant).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`
    })
        .where(eq(tenant.id, tenantId))
        .returning({ deleted_at: tenant.deletedAt })

    if (!deleted) return { ok: false }
    return { ok: true }
}

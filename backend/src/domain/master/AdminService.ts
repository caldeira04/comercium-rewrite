import { db } from "@/db/db"
import { subscriptionStatus, tenant } from "@/db/schema/master/tenant"
import { and, asc, eq, isNull, sql } from "drizzle-orm"

export async function listTenants(includeDeleted?: boolean) {

    const conditions = []
    if (!includeDeleted) {
        conditions.push(eq(tenant.isActive, true), isNull(tenant.deletedAt))
    }

    const tenants = await db
        .select({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            legalName: tenant.legalName,
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor,
            timezone: tenant.timezone,
            currency: tenant.currency,
            subscriptionStatusId: tenant.subscriptionStatusId,
            subscriptionStatus: subscriptionStatus.label,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
            deletedAt: tenant.deletedAt
        })
        .from(tenant)
        .leftJoin(
            subscriptionStatus,
            eq(tenant.subscriptionStatusId, subscriptionStatus.id)
        )
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(tenant.name))

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

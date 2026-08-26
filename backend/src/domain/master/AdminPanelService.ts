import { existsSync } from "node:fs"
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, like, or, sql, sum } from "drizzle-orm"
import { db, getTenantDb } from "@/db/db"
import { getTenantDbPath } from "@/config/paths"
import { tenant } from "@/db/schema/master/tenant"
import { tenantUser, session } from "@/db/schema/master/auth"
import { adminUser, adminAuditLog, systemError } from "@/db/schema/master/admin"
import { product } from "@/db/schema/tenant/product"
import { sale } from "@/db/schema/tenant/sale"
import { payment } from "@/db/schema/tenant/payment"
import { client } from "@/db/schema/tenant/client"
import { cash } from "@/db/schema/tenant/cash"
import { AppError } from "../../utils/errors"
import { audit } from "../../utils/audit"
import { generateSessionToken, hashToken } from "../../utils/auth"

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

type SortField = "createdAt" | "updatedAt" | "name"
type SortDir = "asc" | "desc"

function sortColumn(field: SortField) {
    switch (field) {
        case "name": return tenant.name
        case "updatedAt": return tenant.updatedAt
        default: return tenant.createdAt
    }
}

export async function getOverview() {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30).toISOString()

    const tenants = await db.select().from(tenant)
    const activeTenants = tenants.filter((t) => t.isActive && !t.deletedAt)
    const newTenants30d = tenants.filter((t) => !t.deletedAt && t.createdAt >= thirtyDaysAgo)

    const users = await db.select({ id: tenantUser.id, tenantId: tenantUser.tenantId }).from(tenantUser)
    const activeTenantIds = new Set(activeTenants.map((t) => t.id))
    const activeUsers = users.filter((u) => activeTenantIds.has(u.tenantId))

    let totalProducts = 0
    let totalSales = 0
    let totalSalesAmount = 0
    let salesToday = 0
    let salesTodayAmount = 0
    let openCashes = 0

    const needsAttention: Array<{ severity: "high" | "medium" | "low", kind: string, message: string, tenantId?: string, tenantName?: string }> = []

    for (const t of activeTenants) {
        if (!t.slug) continue
        const stats = await aggregateTenantStats(t.slug)
        if (!stats) {
            needsAttention.push({
                severity: "high",
                kind: "tenant_database",
                message: `banco de dados do tenant ${t.name} indisponível`,
                tenantId: t.id,
                tenantName: t.name,
            })
            continue
        }

        totalProducts += stats.products
        totalSales += stats.sales
        totalSalesAmount += stats.salesAmount
        salesToday += stats.salesToday
        salesTodayAmount += stats.salesTodayAmount
        openCashes += stats.openCashes

        if (stats.salesToday === 0) {
            const lastSale = stats.recentSales[0]
            needsAttention.push({
                severity: "low",
                kind: "no_activity",
                message: lastSale
                    ? `${t.name} sem vendas hoje (última em ${lastSale.createdAt})`
                    : `${t.name} sem vendas registradas`,
                tenantId: t.id,
                tenantName: t.name,
            })
        }
    }

    if (activeTenants.length === 0) {
        needsAttention.push({
            severity: "low",
            kind: "no_tenants",
            message: "nenhum tenant ativo no momento",
        })
    }

    for (const t of activeTenants) {
        if (t.subscriptionExpireDate && new Date(t.subscriptionExpireDate) < now) {
            needsAttention.push({
                severity: "high",
                kind: "subscription_expired",
                message: `assinatura de ${t.name} expirada em ${t.subscriptionExpireDate}`,
                tenantId: t.id,
                tenantName: t.name,
            })
        }
    }
    if (activeTenants.length === 0) {
        needsAttention.push({
            severity: "low",
            kind: "no_tenants",
            message: "nenhum tenant ativo no momento",
        })
    }

    const planDistribution = countBy(tenants, (t) => t.planId ?? "sem plano")
    const subscriptionStatusDistribution = countBy(tenants, (t) => t.subscriptionStatusId ?? "sem status")

    const recentErrors = await db.select()
        .from(systemError)
        .orderBy(desc(systemError.createdAt))
        .limit(20)

    const errorsLast24h = await db.select({ count: count() })
        .from(systemError)
        .where(gte(systemError.createdAt, new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()))

    const errorsLast1h = await db.select({ count: count() })
        .from(systemError)
        .where(gte(systemError.createdAt, new Date(Date.now() - 1000 * 60 * 60).toISOString()))

    return {
        metrics: {
            totalTenants: tenants.filter((t) => !t.deletedAt).length,
            activeTenants: activeTenants.length,
            inactiveTenants: tenants.filter((t) => !t.isActive && !t.deletedAt).length,
            newTenants30d: newTenants30d.length,
            totalUsers: users.length,
            activeUsers: activeUsers.length,
            totalProducts,
            totalSales,
            totalSalesAmount,
            salesToday,
            salesTodayAmount,
            openCashes,
            errors24h: errorsLast24h[0]?.count ?? 0,
            errors1h: errorsLast1h[0]?.count ?? 0,
        },
        planDistribution: planDistribution.map(([label, value]) => ({ label, value })),
        subscriptionStatusDistribution: subscriptionStatusDistribution.map(([label, value]) => ({ label, value })),
        needsAttention,
        recentErrors,
        recentFiscalFailures: [],
    }
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
    const map = new Map<string, number>()
    for (const item of items) {
        const key = keyFn(item)
        map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
}

export async function aggregateTenantStats(slug: string) {
    try {
        const tdb = getTenantDb(slug)
        const todayStart = localMidnightString()

        const [productsRow] = await tdb.select({ total: count() })
            .from(product)
            .where(isNull(product.deletedAt))

        const [salesRow] = await tdb.select({ total: count(), amount: sum(sale.totalAmount) })
            .from(sale)
            .where(isNull(sale.deletedAt))

        const [settledRow] = await tdb.select({ total: count() })
            .from(sale)
            .where(and(isNull(sale.deletedAt), isNotNull(sale.settledAt)))

        const [salesTodayRow] = await tdb.select({ total: count(), amount: sum(sale.totalAmount) })
            .from(sale)
            .where(and(isNull(sale.deletedAt), gte(sale.createdAt, todayStart)))

        const [clientsRow] = await tdb.select({ total: count() })
            .from(client)
            .where(isNull(client.deletedAt))

        const [paymentsRow] = await tdb.select({ total: count() })
            .from(payment)

        const [openCashRow] = await tdb.select({ total: count() })
            .from(cash)
            .where(isNull(cash.closedAt))

        const recentSales = await tdb.select({
            id: sale.id,
            totalAmount: sale.totalAmount,
            createdAt: sale.createdAt,
            settledAt: sale.settledAt,
        }).from(sale)
            .where(isNull(sale.deletedAt))
            .orderBy(desc(sale.createdAt))
            .limit(5)

        return {
            products: productsRow?.total ?? 0,
            sales: salesRow?.total ?? 0,
            salesAmount: Number(salesRow?.amount ?? 0),
            settledSales: settledRow?.total ?? 0,
            salesToday: salesTodayRow?.total ?? 0,
            salesTodayAmount: Number(salesTodayRow?.amount ?? 0),
            clients: clientsRow?.total ?? 0,
            payments: paymentsRow?.total ?? 0,
            openCashes: openCashRow?.total ?? 0,
            recentSales,
        }
    } catch (error) {
        console.error(`failed to aggregate tenant stats for "${slug}":`, error)
        return null
    }
}

function localMidnightString() {
    const now = new Date()
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} 00:00:00`
}

export async function listAdminTenants(params: {
    q?: string
    status?: "all" | "active" | "inactive" | "deleted"
    plan?: string
    sort?: string
    page?: number
    pageSize?: number
}) {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
    const conditions = []

    if (params.q) {
        const q = `%${params.q}%`
        conditions.push(or(
            like(tenant.name, q),
            like(tenant.slug, q),
            like(tenant.legalName, q),
            like(tenant.document, q),
            like(tenant.email, q),
        ))
    }

    switch (params.status) {
        case "active":
            conditions.push(and(eq(tenant.isActive, true), isNull(tenant.deletedAt)))
            break
        case "inactive":
            conditions.push(and(eq(tenant.isActive, false), isNull(tenant.deletedAt)))
            break
        case "deleted":
            conditions.push(isNotNull(tenant.deletedAt))
            break
    }

    if (params.plan) {
        if (params.plan === "none") {
            conditions.push(isNull(tenant.planId))
        } else {
            conditions.push(eq(tenant.planId, params.plan))
        }
    }

    const [sortField, sortDir] = (params.sort ?? "createdAt_desc").split("_") as [SortField, SortDir]
    const order = sortDir === "asc"
        ? asc(sortColumn(sortField ?? "createdAt"))
        : desc(sortColumn(sortField ?? "createdAt"))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, [totalRow]] = await Promise.all([
        db.select().from(tenant).where(where).orderBy(order).limit(pageSize).offset((page - 1) * pageSize),
        db.select({ total: count() }).from(tenant).where(where),
    ])

    return {
        tenants: rows,
        pagination: {
            page,
            pageSize,
            total: totalRow?.total ?? 0,
            totalPages: Math.ceil((totalRow?.total ?? 0) / pageSize),
        },
    }
}

export async function getTenantDetail(tenantId: string) {
    const tenantRow = await db.query.tenant.findFirst({
        where: (t, { eq }) => eq(t.id, tenantId),
    })
    if (!tenantRow) throw new AppError("loja não encontrada", 404, "TENANT_NOT_FOUND")

    const [usersRow, totalUsersRow] = await Promise.all([
        db.select({
            id: tenantUser.id,
            login: tenantUser.login,
            isActive: tenantUser.isActive,
            createdAt: tenantUser.createdAt,
            lastLogin: sql<string>`(select max(s.created_at) from session s where s.tenant_user_id = ${tenantUser.id})`,
        }).from(tenantUser).where(eq(tenantUser.tenantId, tenantId)).orderBy(asc(tenantUser.createdAt)),
        db.select({ total: count() }).from(tenantUser).where(eq(tenantUser.tenantId, tenantId)),
    ])

    let stats = null
    if (tenantRow.slug) {
        stats = await aggregateTenantStats(tenantRow.slug)
    }

    const dbPath = tenantRow.slug ? getTenantDbPath(tenantRow.slug) : null

    return {
        tenant: tenantRow,
        database: dbPath ? existsSync(dbPath) : false,
        users: usersRow,
        userCount: totalUsersRow[0]?.total ?? 0,
        stats,
    }
}

export async function updateAdminTenant(tenantId: string, data: Partial<{
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
    timezone: string
    currency: string
    isActive: boolean
    planId: string | null
    subscriptionStatusId: string | null
    subscriptionExpireDate: string | null
}>, actorId: string) {
    const [updated] = await db.update(tenant)
        .set(data)
        .where(eq(tenant.id, tenantId))
        .returning()

    if (!updated) throw new AppError("loja não encontrada", 404, "TENANT_NOT_FOUND")

    await audit({
        adminUserId: actorId,
        action: "tenant.update",
        targetType: "tenant",
        targetId: tenantId,
        tenantId,
        metadata: { fields: Object.keys(data) },
    })

    return updated
}

export async function deleteAdminTenant(tenantId: string, actorId: string) {
    const target = await db.query.tenant.findFirst({ where: (t, { eq }) => eq(t.id, tenantId) })
    if (!target) throw new AppError("loja não encontrada", 404, "TENANT_NOT_FOUND")

    const deleted = await db.update(tenant).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        isActive: false,
    }).where(eq(tenant.id, tenantId)).returning({ id: tenant.id })

    if (!deleted) throw new AppError("loja não encontrada", 404, "TENANT_NOT_FOUND")

    await audit({
        adminUserId: actorId,
        action: "tenant.delete",
        targetType: "tenant",
        targetId: tenantId,
        tenantId,
        metadata: { name: target.name, slug: target.slug },
    })

    return { ok: true }
}

export async function listAdminUsers(params: {
    q?: string
    tenantId?: string
    page?: number
    pageSize?: number
}) {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
    const conditions = []

    if (params.q) {
        conditions.push(like(tenantUser.login, `%${params.q}%`))
    }
    if (params.tenantId) {
        conditions.push(eq(tenantUser.tenantId, params.tenantId))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, [totalRow]] = await Promise.all([
        db.select({
            id: tenantUser.id,
            login: tenantUser.login,
            tenantId: tenantUser.tenantId,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            isActive: tenantUser.isActive,
            createdAt: tenantUser.createdAt,
        })
            .from(tenantUser)
            .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
            .where(where)
            .orderBy(desc(tenantUser.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ total: count() })
            .from(tenantUser)
            .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
            .where(where),
    ])

    const sessions = await db.select({
        tenantUserId: session.tenantUserId,
        lastLogin: sql<string>`max(${session.createdAt})`,
    }).from(session)
        .where(inArray(session.tenantUserId, rows.map((r) => r.id)))
        .groupBy(session.tenantUserId)

    const lastLoginByUser = new Map(sessions.map((s) => [s.tenantUserId, s.lastLogin]))

    return {
        users: rows.map((u) => ({ ...u, lastLogin: lastLoginByUser.get(u.id) ?? null })),
        pagination: {
            page,
            pageSize,
            total: totalRow?.total ?? 0,
            totalPages: Math.ceil((totalRow?.total ?? 0) / pageSize),
        },
    }
}

export async function setUserActive(userId: string, isActive: boolean, actorId: string) {
    const target = await db.query.tenantUser.findFirst({
        where: (u, { eq }) => eq(u.id, userId),
        with: { tenant: { columns: { id: true, name: true } } },
    })
    if (!target) throw new AppError("usuário não encontrado", 404, "USER_NOT_FOUND")

    const [updated] = await db.update(tenantUser).set({ isActive }).where(eq(tenantUser.id, userId)).returning({
        id: tenantUser.id,
        login: tenantUser.login,
        isActive: tenantUser.isActive,
    })

    await audit({
        adminUserId: actorId,
        action: isActive ? "user.enable" : "user.disable",
        targetType: "tenant_user",
        targetId: userId,
        tenantId: target.tenantId,
        metadata: { login: target.login },
    })

    return updated
}

export async function getAuditLogs(params: {
    actorId?: string
    action?: string
    targetType?: string
    tenantId?: string
    page?: number
    pageSize?: number
}) {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50))
    const conditions = []

    if (params.actorId) conditions.push(eq(adminAuditLog.adminUserId, params.actorId))
    if (params.action) conditions.push(eq(adminAuditLog.action, params.action))
    if (params.targetType) conditions.push(eq(adminAuditLog.targetType, params.targetType))
    if (params.tenantId) conditions.push(eq(adminAuditLog.tenantId, params.tenantId))

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, [totalRow]] = await Promise.all([
        db.select({
            id: adminAuditLog.id,
            adminUserId: adminAuditLog.adminUserId,
            action: adminAuditLog.action,
            targetType: adminAuditLog.targetType,
            targetId: adminAuditLog.targetId,
            tenantId: adminAuditLog.tenantId,
            metadata: adminAuditLog.metadata,
            result: adminAuditLog.result,
            createdAt: adminAuditLog.createdAt,
            adminLogin: adminUser.login,
            adminName: adminUser.name,
        })
            .from(adminAuditLog)
            .leftJoin(adminUser, eq(adminAuditLog.adminUserId, adminUser.id))
            .where(where)
            .orderBy(desc(adminAuditLog.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db.select({ total: count() }).from(adminAuditLog).where(where),
    ])

    return {
        events: rows.map((row) => ({
            ...row,
            metadata: row.metadata ? safeParseJson(row.metadata) : null,
        })),
        pagination: {
            page,
            pageSize,
            total: totalRow?.total ?? 0,
            totalPages: Math.ceil((totalRow?.total ?? 0) / pageSize),
        },
    }
}

function safeParseJson(value: string) {
    try {
        return JSON.parse(value) as Record<string, unknown>
    } catch {
        return null
    }
}

export async function globalSearch(q: string) {
    const term = q.trim()
    if (!term) return { tenants: [], users: [], admins: [], fiscalDocuments: [] }

    const pattern = `%${term}%`
    const idPattern = `${term}%`

    const [tenants, users, admins] = await Promise.all([
        db.select({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            document: tenant.document,
            email: tenant.email,
            isActive: tenant.isActive,
            deletedAt: tenant.deletedAt,
        }).from(tenant)
            .where(or(
                like(tenant.name, pattern),
                like(tenant.slug, pattern),
                like(tenant.legalName, pattern),
                like(tenant.document, pattern),
                like(tenant.email, pattern),
                like(tenant.id, idPattern),
            ))
            .limit(20),

        db.select({
            id: tenantUser.id,
            login: tenantUser.login,
            tenantId: tenantUser.tenantId,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            isActive: tenantUser.isActive,
        }).from(tenantUser)
            .innerJoin(tenant, eq(tenantUser.tenantId, tenant.id))
            .where(or(
                like(tenantUser.login, pattern),
                like(tenantUser.id, idPattern),
            ))
            .limit(20),

        db.select({
            id: adminUser.id,
            name: adminUser.name,
            login: adminUser.login,
            role: adminUser.role,
            isActive: adminUser.isActive,
        }).from(adminUser)
            .where(or(
                like(adminUser.login, pattern),
                like(adminUser.name, pattern),
                like(adminUser.id, idPattern),
            ))
            .limit(20),
    ])

    return {
        tenants,
        users,
        admins,
        fiscalDocuments: [],
    }
}

export async function getHealth() {
    let masterOk = true
    try {
        db.run(sql`SELECT 1`)
    } catch {
        masterOk = false
    }

    const tenants = await db.select({ id: tenant.id, name: tenant.name, slug: tenant.slug }).from(tenant)
    const missing = tenants.filter((t) => !t.slug || !existsSync(getTenantDbPath(t.slug!)))

    const [errors24h] = await db.select({ count: count() }).from(systemError).where(
        gte(systemError.createdAt, new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString())
    )
    const [errors1h] = await db.select({ count: count() }).from(systemError).where(
        gte(systemError.createdAt, new Date(Date.now() - 1000 * 60 * 60).toISOString())
    )

    const recent5xx = await db.select()
        .from(systemError)
        .where(gte(systemError.statusCode, 500))
        .orderBy(desc(systemError.createdAt))
        .limit(20)

    return {
        api: "ok",
        masterDatabase: masterOk ? "ok" : "error",
        tenantDatabases: {
            total: tenants.length,
            missing: missing.length,
            missingTenants: missing.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
        },
        errors: {
            last1h: errors1h?.count ?? 0,
            last24h: errors24h?.count ?? 0,
        },
        recent5xx,
        services: {
            backgroundJobs: "not_configured",
            queues: "not_configured",
            webhooks: "not_configured",
            fiscal: "not_configured",
        },
        timestamp: new Date().toISOString(),
    }
}

export async function getBillingSummary() {
    const tenants = await db.select().from(tenant).where(isNull(tenant.deletedAt))
    const now = new Date()

    const planDistribution = countBy(tenants, (t) => t.planId ?? "sem plano")
    const statusDistribution = countBy(tenants, (t) => t.subscriptionStatusId ?? "sem status")

    const expired = tenants.filter((t) => t.subscriptionExpireDate && new Date(t.subscriptionExpireDate) < now)
    const dueSoon = tenants.filter((t) => {
        if (!t.subscriptionExpireDate) return false
        const expire = new Date(t.subscriptionExpireDate)
        return expire >= now && expire <= new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7)
    })
    const withoutPlan = tenants.filter((t) => !t.planId)

    const pick = (t: typeof tenants[number]) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        planId: t.planId,
        subscriptionStatusId: t.subscriptionStatusId,
        subscriptionExpireDate: t.subscriptionExpireDate,
        isActive: t.isActive,
    })

    return {
        mrr: null,
        activeSubscriptions: tenants.filter((t) => t.subscriptionStatusId && t.subscriptionStatusId.toLowerCase() !== "cancelled" && t.isActive).length,
        planDistribution: planDistribution.map(([label, value]) => ({ label, value })),
        statusDistribution: statusDistribution.map(([label, value]) => ({ label, value })),
        expired: expired.map(pick),
        dueSoon: dueSoon.map(pick),
        withoutPlan: withoutPlan.map(pick),
        // real subscription history/price are not modeled yet; tenants without expire date have none
    }
}

export async function getFiscalOverview() {
    return {
        configured: false,
        documentsIssued: 0,
        authorized: 0,
        rejected: 0,
        cancelled: 0,
        contingency: 0,
        failureRate: 0,
        rejectionCodes: [],
        recentErrors: [],
    }
}

export async function listFiscalDocuments(params: {
    status?: string
    page?: number
    pageSize?: number
}) {
    const page = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
    return {
        configured: false,
        documents: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
    }
}

export async function impersonateTenantUser(tenantUserId: string, adminId: string, adminLogin: string) {
    const target = await db.query.tenantUser.findFirst({
        where: (u, { eq }) => eq(u.id, tenantUserId),
        with: { tenant: { columns: { id: true, name: true, slug: true, isActive: true, deletedAt: true } } },
    })

    if (!target) throw new AppError("usuário não encontrado", 404, "USER_NOT_FOUND")
    if (!target.tenant) throw new AppError("tenant não encontrado", 404, "TENANT_NOT_FOUND")
    if (!target.tenant.isActive || target.tenant.deletedAt) {
        throw new AppError("tenant inativo", 409, "TENANT_INACTIVE")
    }

    const token = generateSessionToken()
    const tokenHash = await hashToken(token)

    await db.insert(session).values({
        tenantUserId: target.id,
        tokenHash,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        impersonatedByAdminId: adminId,
    })

    await audit({
        adminUserId: adminId,
        action: "impersonation.start",
        targetType: "tenant_user",
        targetId: target.id,
        tenantId: target.tenantId,
        metadata: {
            admin: adminLogin,
            targetUser: target.login,
            tenant: target.tenant.name,
            slug: target.tenant.slug,
        },
    })

    return {
        token,
        tenant: {
            id: target.tenantId,
            name: target.tenant.name,
            slug: target.tenant.slug,
        },
        user: {
            id: target.id,
            login: target.login,
        },
    }
}
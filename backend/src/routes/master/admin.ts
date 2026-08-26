import { Elysia, t } from "elysia"
import {
    adminAuthStatus,
    bootstrapAdmin,
    createAdmin,
    deleteAdmin,
    listAdmins,
    loginAdmin,
    updateAdmin,
} from "@/domain/master/AdminAuthService"
import {
    deleteAdminTenant,
    getAuditLogs,
    getBillingSummary,
    getFiscalOverview,
    getHealth,
    getOverview,
    getTenantDetail,
    globalSearch,
    impersonateTenantUser,
    listAdminTenants,
    listAdminUsers,
    listFiscalDocuments,
    setUserActive,
    updateAdminTenant,
} from "@/domain/master/AdminPanelService"
import { createAnnouncement, deleteAnnouncement, listAnnouncements, updateAnnouncement } from "@/domain/master/AnnouncementService"
import { createFlag, deleteFlag, evaluateFlag, listFlags, updateFlag } from "@/domain/master/FlagService"
import { adminAuthPlugin } from "../../utils/admin-elysia"
import { AppError } from "../../utils/errors"
import type { AdminRole } from "@/domain/master/AdminAuthService"

export const adminPublic = new Elysia()
    .get("/auth/status", async () => adminAuthStatus())
    .post("/auth/bootstrap", async ({ body }) => bootstrapAdmin(body), {
        body: t.Object({
            name: t.String({ minLength: 1 }),
            login: t.String({ format: "email" }),
            password: t.String({ minLength: 6 }),
        })
    })
    .post("/auth/login", async ({ body, cookie }) => {
        const token = await loginAdmin(body.login, body.password)

        cookie.admin_session.set({
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        })

        return { ok: true }
    }, {
        body: t.Object({
            login: t.String(),
            password: t.String(),
        })
    })
    .post("/auth/logout", async ({ cookie }) => {
        cookie.admin_session.remove()
        return { ok: true }
    })

export const adminProtected = new Elysia()
    .use(adminAuthPlugin)
    .get("/auth/me", async ({ admin }) => admin)
    .get("/overview", async () => getOverview())
    .get("/admins", async () => listAdmins())
    .post("/admins", async ({ body, admin }) => {
        requireOwner(admin)
        return await createAdmin(body, admin.adminId)
    }, {
        body: t.Object({
            name: t.String({ minLength: 1 }),
            login: t.String({ format: "email" }),
            password: t.String({ minLength: 6 }),
            role: t.Enum({ owner: "owner", admin: "admin" }),
        })
    })
    .patch("/admins/:adminId", async ({ params, body, admin }) => {
        requireOwner(admin)
        return await updateAdmin(params.adminId, body, admin.adminId)
    }, {
        params: t.Object({ adminId: t.String() }),
        body: t.Partial(t.Object({
            name: t.String(),
            role: t.Enum({ owner: "owner", admin: "admin" }),
            isActive: t.Boolean(),
            password: t.String({ minLength: 6 }),
        }))
    })
    .delete("/admins/:adminId", async ({ params, admin }) => {
        requireOwner(admin)
        return await deleteAdmin(params.adminId, admin.adminId)
    }, {
        params: t.Object({ adminId: t.String() })
    })
    .get("/tenants", async ({ query }) => {
        return await listAdminTenants({
            q: query.q,
            status: query.status,
            plan: query.plan,
            sort: query.sort,
            page: query.page ? Number(query.page) : undefined,
            pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        })
    }, {
        query: t.Partial(t.Object({
            q: t.String(),
            status: t.Enum({ all: "all", active: "active", inactive: "inactive", deleted: "deleted" }),
            plan: t.String(),
            sort: t.String(),
            page: t.String(),
            pageSize: t.String(),
        }))
    })
    .get("/tenants/:tenantId", async ({ params }) => {
        return await getTenantDetail(params.tenantId)
    }, {
        params: t.Object({ tenantId: t.String() })
    })
    .patch("/tenants/:tenantId", async ({ params, body, admin }) => {
        return await updateAdminTenant(params.tenantId, body, admin.adminId)
    }, {
        params: t.Object({ tenantId: t.String() }),
        body: t.Partial(t.Object({
            name: t.String(),
            legalName: t.String(),
            document: t.String(),
            email: t.String(),
            phone: t.String(),
            zipcode: t.String(),
            street: t.String(),
            state: t.String(),
            district: t.String(),
            city: t.String(),
            number: t.String(),
            country: t.String(),
            timezone: t.String(),
            currency: t.String(),
            isActive: t.Boolean(),
            planId: t.Union([t.String(), t.Null()]),
            subscriptionStatusId: t.Union([t.String(), t.Null()]),
            subscriptionExpireDate: t.Union([t.String(), t.Null()]),
        }))
    })
    .delete("/tenants/:tenantId", async ({ params, admin }) => {
        requireOwner(admin)
        return await deleteAdminTenant(params.tenantId, admin.adminId)
    }, {
        params: t.Object({ tenantId: t.String() })
    })
    .get("/users", async ({ query }) => {
        return await listAdminUsers({
            q: query.q,
            tenantId: query.tenantId,
            page: query.page ? Number(query.page) : undefined,
            pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        })
    }, {
        query: t.Partial(t.Object({
            q: t.String(),
            tenantId: t.String(),
            page: t.String(),
            pageSize: t.String(),
        }))
    })
    .patch("/users/:userId", async ({ params, body, admin }) => {
        if (typeof body.isActive !== "boolean") {
            throw new AppError("isActive é obrigatório", 400, "VALIDATION_ERROR")
        }
        return await setUserActive(params.userId, body.isActive, admin.adminId)
    }, {
        params: t.Object({ userId: t.String() }),
        body: t.Object({ isActive: t.Boolean() })
    })
    .get("/search", async ({ query }) => {
        return await globalSearch(query.q ?? "")
    }, {
        query: t.Object({ q: t.String() })
    })
    .get("/audit", async ({ query }) => {
        return await getAuditLogs({
            actorId: query.actorId,
            action: query.action,
            targetType: query.targetType,
            tenantId: query.tenantId,
            page: query.page ? Number(query.page) : undefined,
            pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        })
    }, {
        query: t.Partial(t.Object({
            actorId: t.String(),
            action: t.String(),
            targetType: t.String(),
            tenantId: t.String(),
            page: t.String(),
            pageSize: t.String(),
        }))
    })
    .get("/health", async () => getHealth())
    .get("/billing/summary", async () => getBillingSummary())
    .get("/fiscal/overview", async () => getFiscalOverview())
    .get("/fiscal/documents", async ({ query }) => {
        return await listFiscalDocuments({
            status: query.status,
            page: query.page ? Number(query.page) : undefined,
            pageSize: query.pageSize ? Number(query.pageSize) : undefined,
        })
    }, {
        query: t.Partial(t.Object({
            status: t.String(),
            page: t.String(),
            pageSize: t.String(),
        }))
    })
    .post("/impersonate", async ({ body, admin }) => {
        return await impersonateTenantUser(body.tenantUserId, admin.adminId, admin.login)
    }, {
        body: t.Object({ tenantUserId: t.String() })
    })
    .get("/flags", async () => listFlags())
    .get("/flags/eval", async ({ query }) => {
        return { enabled: await evaluateFlag(query.key, query.tenantId) }
    }, {
        query: t.Object({ key: t.String(), tenantId: t.Optional(t.String()) })
    })
    .post("/flags", async ({ body, admin }) => {
        return await createFlag(body, admin.adminId)
    }, {
        body: t.Object({
            key: t.String({ minLength: 1 }),
            description: t.Optional(t.String()),
            scope: t.Enum({ global: "global", tenant: "tenant" }),
            tenantId: t.Optional(t.Union([t.String(), t.Null()])),
            enabled: t.Optional(t.Boolean()),
        })
    })
    .patch("/flags/:flagId", async ({ params, body, admin }) => {
        return await updateFlag(params.flagId, body, admin.adminId)
    }, {
        params: t.Object({ flagId: t.String() }),
        body: t.Partial(t.Object({
            key: t.String(),
            description: t.String(),
            scope: t.Enum({ global: "global", tenant: "tenant" }),
            tenantId: t.Union([t.String(), t.Null()]),
            enabled: t.Boolean(),
        }))
    })
    .delete("/flags/:flagId", async ({ params, admin }) => {
        return await deleteFlag(params.flagId, admin.adminId)
    }, {
        params: t.Object({ flagId: t.String() })
    })
    .get("/announcements", async () => listAnnouncements())
    .post("/announcements", async ({ body, admin }) => {
        return await createAnnouncement(body, admin.adminId)
    }, {
        body: t.Object({
            title: t.String({ minLength: 1 }),
            body: t.String({ minLength: 1 }),
            scope: t.Enum({ global: "global", tenant: "tenant" }),
            tenantId: t.Optional(t.Union([t.String(), t.Null()])),
            isActive: t.Optional(t.Boolean()),
            startsAt: t.Optional(t.Union([t.String(), t.Null()])),
            endsAt: t.Optional(t.Union([t.String(), t.Null()])),
        })
    })
    .patch("/announcements/:announcementId", async ({ params, body, admin }) => {
        return await updateAnnouncement(params.announcementId, body, admin.adminId)
    }, {
        params: t.Object({ announcementId: t.String() }),
        body: t.Partial(t.Object({
            title: t.String(),
            body: t.String(),
            scope: t.Enum({ global: "global", tenant: "tenant" }),
            tenantId: t.Union([t.String(), t.Null()]),
            isActive: t.Boolean(),
            startsAt: t.Union([t.String(), t.Null()]),
            endsAt: t.Union([t.String(), t.Null()]),
        }))
    })
    .delete("/announcements/:announcementId", async ({ params, admin }) => {
        return await deleteAnnouncement(params.announcementId, admin.adminId)
    }, {
        params: t.Object({ announcementId: t.String() })
    })

function requireOwner(admin: { role: AdminRole }) {
    if (admin.role !== "owner") {
        throw new AppError("permissão negada", 403, "ADMIN_FORBIDDEN")
    }
}

export default [adminPublic, adminProtected]
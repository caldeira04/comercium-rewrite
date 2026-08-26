import { Elysia, t } from "elysia"
import { validateAdminSession } from "@/domain/master/AdminAuthService"
import { AppError } from "./errors"

export const adminSessionCookie = new Elysia().guard({
    cookie: t.Object({
        admin_session: t.String()
    })
})

export const adminAuthPlugin = new Elysia()
    .use(adminSessionCookie)
    .derive({ as: "scoped" }, async ({ cookie }) => {
        const token = cookie.admin_session.value

        if (typeof token !== "string" || !token) {
            throw new AppError("não autorizado", 401, "ADMIN_UNAUTHORIZED")
        }

        const auth = await validateAdminSession(token)

        if (!auth) {
            throw new AppError("não autorizado", 401, "ADMIN_UNAUTHORIZED")
        }

        return {
            admin: auth
        }
    })

export function requireOwner(admin: { role: string }) {
    if (admin.role !== "owner") {
        throw new AppError("permissão negada", 403, "ADMIN_FORBIDDEN")
    }
}
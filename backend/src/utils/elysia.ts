import { Elysia, t } from "elysia"
import { validateSession } from "@/domain/master/AuthService"
import { AppError } from "./errors"

export const sessionCookie = new Elysia().guard({
    cookie: t.Object({
        session: t.String()
    })
})

export const authPlugin = new Elysia()
    .use(sessionCookie)
    .derive({ as: "scoped" }, async ({ cookie }) => {
        const token = cookie.session.value

        if (typeof token !== "string" || !token) {
            throw new AppError("não autorizado", 401, "UNAUTHORIZED")
        }

        const auth = await validateSession(token)

        if (!auth) {
            throw new AppError("não autorizado", 401, "UNAUTHORIZED")
        }

        return {
            auth
        }
    })

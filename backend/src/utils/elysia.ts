import { Elysia, t } from "elysia"
import { validateSession } from "@/domain/master/AuthService"

export const sessionCookie = new Elysia().guard({
    cookie: t.Object({
        session: t.String()
    })
})

export const authPlugin = new Elysia()
    .use(sessionCookie)
    .derive({ as: "scoped" }, async ({ cookie, set }) => {
        const token = cookie.session.value

        if (typeof token !== "string" || !token) {
            set.status = 401
            throw new Error("Unauthorized")
        }

        const auth = await validateSession(token)

        if (!auth) {
            set.status = 401
            throw new Error("Unauthorized")
        }

        return {
            auth
        }
    })

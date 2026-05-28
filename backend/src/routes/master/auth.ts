import { login, signUp, validateSession } from "@/domain/master/AuthService"
import { Elysia, t } from "elysia"

const auth = new Elysia({ prefix: "/auth" })

auth.post("/signup", async ({ body, cookie, set }) => {
    const { tenantSlug, document, email, name, phone, password } = body

    const token = await signUp(tenantSlug, document, email, name, phone, password)

    if (!token) {
        set.status = 401
        return { error: "Login ou senha inválidos" }
    }

    cookie.session.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
    })

    return { ok: true }
}, {
    body: t.Object({
        tenantSlug: t.String(),
        document: t.String(),
        email: t.String(),
        name: t.String(),
        phone: t.String(),
        password: t.String(),
    })
})

auth.post("/login", async ({ body, cookie, set }) => {
    const { login: userLogin, password } = body

    const token = await login(userLogin, password)

    if (!token) {
        set.status = 401
        return { error: "Login ou senha inválidos" }
    }

    cookie.session.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7
    })

    return { ok: true }
}, {
    body: t.Object({
        login: t.String({ minLength: 1 }),
        password: t.String({ minLength: 1 }),
    })
})

auth.get("/me", async ({ cookie, set }) => {
    const token = cookie.session.value

    if (typeof token !== "string" || !token) {
        set.status = 401
        return { error: "Unauthorized" }
    }

    const auth = await validateSession(token)

    if (!auth) {
        set.status = 401
        return { error: "Unauthorized" }
    }

    return auth
})

auth.post("/logout", async ({ cookie }) => {
    cookie.session.remove()
    return { ok: true }
})

export default auth

import { login } from "@/domain/tenant/auth"
import { Elysia } from "elysia"

const auth = new Elysia()

auth.post("/login", async ({ body, cookie, set }) => {
    const { login: userLogin, password } = body as {
        login: string
        password: string
    }

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
})

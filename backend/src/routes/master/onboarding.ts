import { signUp } from "@/domain/master/AuthService"
import { listTenants } from "@/domain/master/AdminService"
import { Elysia, t } from "elysia"

const onboarding = new Elysia({ prefix: "/onboarding" })

onboarding.get("/status", async () => {
    const tenants = await listTenants(false, false)
    const isSetup = tenants.length > 0

    return {
        isSetup,
        tenantsCount: tenants.length
    }
})

onboarding.post("/setup", async ({ body, cookie, set }) => {
    // Check if already set up
    const tenants = await listTenants(false, false)
    if (tenants.length > 0) {
        set.status = 400
        return { error: "Sistema já foi configurado" }
    }

    const { tenantSlug, tenantName, tenantDocument, adminEmail, adminPhone, adminPassword } = body

    try {
        // Pass tenantName as the name parameter for the tenant
        const token = await signUp(tenantSlug, tenantDocument, adminEmail, tenantName, adminPhone, adminPassword)

        if (!token) {
            set.status = 500
            return { error: "Erro ao criar usuário" }
        }

        cookie.session.set({
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7
        })

        return { ok: true, tenantSlug }
    } catch (error) {
        console.error("Onboarding error:", error)
        set.status = 500
        return { error: error instanceof Error ? error.message : "Erro desconhecido" }
    }
}, {
    body: t.Object({
        tenantSlug: t.String({ minLength: 1 }),
        tenantName: t.String({ minLength: 1 }),
        tenantDocument: t.String({ minLength: 1 }),
        adminEmail: t.String({ format: "email" }),
        adminPhone: t.String({ minLength: 1 }),
        adminPassword: t.String({ minLength: 6 }),
    })
})

export default onboarding

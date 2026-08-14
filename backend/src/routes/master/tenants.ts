import { deleteTenant, getTenant, listTenants, updateTenant } from "@/domain/master/AdminService"
import { Elysia, t } from "elysia"

const tenants = new Elysia({ prefix: "/tenants" })

    .get("/", async ({ query }) => {
        const includeDeleted = query.includeDeleted === "true"
        const includeUsers = query.includeUsers === "true"
        const tenants = await listTenants(includeDeleted, includeUsers)

        return tenants
    }, {
        query: t.Partial(
            t.Object({
                includeDeleted: t.String(),
                includeUsers: t.String(),
            }))
    })

    .get("/:tenantId", async ({ params }) => {
        return await getTenant(params.tenantId)
    }, {
        params: t.Object({
            tenantId: t.String()
        })
    })

    .patch("/:tenantId", async ({ params, body }) => {
        return await updateTenant(params.tenantId, body)
    }, {
        params: t.Object({
            tenantId: t.String()
        }),
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
            logoUrl: t.String(),
            primaryColor: t.String(),
            timezone: t.String(),
            currency: t.String(),
        }))
    })

    .delete("/:tenantId", async ({ params }) => {
        await deleteTenant(params.tenantId)

        return { ok: true }
    }, {
        params: t.Object({
            tenantId: t.String()
        })
    })

export default tenants

import { deleteTenant, listTenants } from "@/domain/master/AdminService"
import { Elysia, t } from "elysia"

const tenants = new Elysia({ prefix: "/tenants" })

tenants

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

    .delete("/:tenantId", async ({ params }) => {
        await deleteTenant(params.tenantId)

        return { ok: true }
    }, {
        params: t.Object({
            tenantId: t.String()
        })
    })

export default tenants

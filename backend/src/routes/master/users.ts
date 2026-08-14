import { createTenantUser, deleteTenantUser, listTenantUsers } from "@/domain/master/AdminService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const users = new Elysia({ prefix: "/users" })
    .use(authPlugin)

    .get("/", async ({ auth }) => {
        return await listTenantUsers(auth.tenantId)
    })

    .post("/", async ({ body, auth }) => {
        return await createTenantUser(auth.tenantId, {
            login: body.login,
            password: body.password,
        })
    }, {
        body: t.Object({
            login: t.String({ minLength: 1 }),
            password: t.String({ minLength: 6 }),
        })
    })

    .delete("/:userId", async ({ params, auth }) => {
        return await deleteTenantUser(params.userId, auth.userId)
    }, {
        params: t.Object({
            userId: t.String(),
        })
    })

export default users
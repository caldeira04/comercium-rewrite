import { createClient, deleteClient, editClient, getClients } from "@/domain/tenant/client/ClientService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const clients = new Elysia({ prefix: "/clients" })
    .use(authPlugin)

    .get("/", async ({ query, auth }) => {
        const includeDeleted = query.includeDeleted === "true"

        const clients = getClients(auth.tenantSlug, includeDeleted)

        return clients
    }, {
        query: t.Partial(
            t.Object({
                includeDeleted: t.String()
            })
        )
    })

    .post("/", async ({ body, auth }) => {
        const { name, document, email, phone } = body

        return await createClient(auth.tenantSlug, {
            name,
            document,
            email,
            phone,
            userId: auth.userId,
        })
    }, {
        body:
            t.Object({
                name: t.String(),
                document: t.Optional(t.String()),
                email: t.Optional(t.String()),
                phone: t.Optional(t.String()),
            }),
    })

    .patch("/:clientId", async ({ params, body, auth }) => {
        const { name, document, email, phone } = body

        return await editClient(auth.tenantSlug, {
            clientId: params.clientId,
            name,
            document,
            email,
            phone,
            userId: auth.userId,
        })

    }, {
        body: t.Partial(
            t.Object({
                name: t.String(),
                document: t.String(),
                email: t.String(),
                phone: t.String(),
            }),
        ),
        params: t.Object({
            clientId: t.Number()
        })
    })

    .delete("/:clientId", async ({ params, auth }) => {
        await deleteClient(auth.tenantSlug, Number(params.clientId), auth.userId)
    })

export default clients

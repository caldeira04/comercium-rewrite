import { createSale, currentSale, settleSale } from "@/domain/tenant/sales/SalesService";
import { authPlugin } from "@/utils/elysia";
import Elysia, { t } from "elysia";

const sales = new Elysia({ prefix: "/sales" })
    .use(authPlugin)
    .get("/", async ({ auth }) => {
        const sale = await currentSale(auth.tenantSlug)

        return sale
    })
    .post("/new", async ({ body, auth }) => {
        const sale = await createSale(auth.tenantSlug, {
            clientId: body.clientId,
            userId: auth.userId
        })

        return sale
    }, {
        body: t.Object({
            clientId: t.Number(),
        })
    })
    .group("/:id", (id) =>
        id
            .post("/settle", async ({ auth, params }) => {
                const settle = await settleSale(auth.tenantSlug, {
                    saleId: params.id,
                    userId: auth.userId
                })

                return settle

            }, {
                params: t.Object({
                    id: t.String()
                }),
            })
    )

export default sales

import { addProductToSale, createSale, currentSale, getSales, settleSale } from "@/domain/tenant/sales/SalesService";
import { authPlugin } from "@/utils/elysia";
import Elysia, { t } from "elysia";

const sales = new Elysia({ prefix: "/sales" })
    .use(authPlugin)

    .get("/", async ({ auth, query }) => {
        const includeDeleted = query.includeDeleted === "true"

        const sales = await getSales(auth.tenantSlug, includeDeleted)

        return sales
    }, {
        query: t.Partial(
            t.Object({
                includeDeleted: t.String()
            })
        )
    })

    .get("/current", async ({ auth }) => {
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

    .post("/item/:productId", async ({ params, body, auth }) => {
        const added = await addProductToSale(auth.tenantSlug, {
            productId: Number(params.productId),
            userId: auth.userId,
            quantity: body.quantity
        })

        return added
    }, {
        params: t.Object({
            productId: t.Number(),
        }),
        body: t.Object({
            quantity: t.Number()
        })
    })

    .post("/settle", async ({ auth }) => {
        const settle = await settleSale(auth.tenantSlug, {
            userId: auth.userId
        })

        return settle
    })

export default sales

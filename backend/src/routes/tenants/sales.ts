import { addProductToSale, createSale, currentSale, getSales, settleSale, updateSaleClient } from "@/domain/tenant/sales/SalesService";
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

    .post("/new", async ({ auth }) => {
        const sale = await createSale(auth.tenantSlug, {
            userId: auth.userId
        })

        return sale
    })

    .post("/item/:productId", async ({ params, body, auth }) => {
        const added = await addProductToSale(auth.tenantSlug, {
            productId: Number(params.productId),
            userId: auth.userId,
            quantity: body.quantity,
            discount: body.discount
        })

        return added
    }, {
        params: t.Object({
            productId: t.Number(),
        }),
        body: t.Object({
            quantity: t.Number(),
            discount: t.Number(),
        })
    })

    .post("/settle/:saleId", async ({ auth, params }) => {
        const settle = await settleSale(auth.tenantSlug, {
            userId: auth.userId,
            saleId: params.saleId
        })

        return settle
    }, {
        params: t.Object({
            saleId: t.String()
        })
    })

    .patch("/:id/client", async ({ body, auth, params }) => {
        const updateClient = await updateSaleClient(auth.tenantSlug, {
            clientId: body.clientId,
            saleId: params.id,
            userId: auth.userId
        })

        return updateClient
    }, {
        body: t.Object({
            clientId: t.Number()
        }),
        params: t.Object({
            id: t.String()
        })
    })


export default sales

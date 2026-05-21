import { createProduct, deleteProduct, getProducts } from "@/domain/tenant/products/ProductsService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const products = new Elysia({ prefix: "/products" })
    .use(authPlugin)

    .get("/", async ({ query, auth }) => {
        const includeDeleted = query.includeDeleted === "true"

        const products = getProducts(auth.tenantSlug, includeDeleted)

        return products
    }, {
        query: t.Partial(
            t.Object({
                includeDeleted: t.String()
            })
        )
    })

    .post("/", async ({ body, auth }) => {
        const { name, buyPrice, sellPrice, gtin } = body

        return await createProduct(auth.tenantSlug, {
            name,
            buyPrice,
            sellPrice,
            gtin: gtin ?? undefined,
            createdByUserId: String(auth.userId),
        })
    }, {
        body:
            t.Object({
                name: t.String(),
                buyPrice: t.Numeric(),
                sellPrice: t.Numeric(),
                gtin: t.Optional(t.String()),
            }),
    })

    .delete("/:productId", async ({ params, auth }) => {
        await deleteProduct(auth.tenantSlug, Number(params.productId), auth.userId)
    })

export default products

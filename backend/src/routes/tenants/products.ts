import { createProduct, deleteProduct, getProducts, getSingleProduct, updateProduct } from "@/domain/tenant/products/ProductsService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const products = new Elysia({ prefix: "/products" })
    .use(authPlugin)

    .get("/", async ({ query, auth }) => {
        const includeDeleted = query.includeDeleted === "true"

        const products = await getProducts(auth.tenantSlug, includeDeleted)

        return products
    }, {
        query: t.Partial(
            t.Object({
                includeDeleted: t.String()
            })
        )
    })

    .get("/:productId", async ({ params, auth }) => {
        return await getSingleProduct(auth.tenantSlug, Number(params.productId))
    }, {
        params: t.Object({
            productId: t.String()
        })
    })

    .post("/", async ({ body, auth }) => {
        const { name, buyPrice, sellPrice, gtin, categoryId } = body

        return await createProduct(auth.tenantSlug, {
            name,
            buyPrice,
            sellPrice,
            gtin: gtin ?? undefined,
            categoryId: categoryId ?? undefined,
            createdByUserId: String(auth.userId),
        })
    }, {
        body:
            t.Object({
                name: t.String(),
                buyPrice: t.Numeric(),
                sellPrice: t.Numeric(),
                gtin: t.Optional(t.String()),
                categoryId: t.Optional(t.Number()),
            }),
    })

    .patch("/:productId", async ({ body, params, auth }) => {
        return await updateProduct(auth.tenantSlug, {
            productId: Number(params.productId),
            name: body.name,
            buyPrice: body.buyPrice,
            sellPrice: body.sellPrice,
            gtin: body.gtin ?? undefined,
            categoryId: body.categoryId,
            userId: auth.userId,
        })
    }, {
        params: t.Object({
            productId: t.String()
        }),
        body: t.Partial(t.Object({
            name: t.String(),
            buyPrice: t.Number(),
            sellPrice: t.Number(),
            gtin: t.Nullable(t.String()),
            categoryId: t.Nullable(t.Number()),
        }))
    })

    .delete("/:productId", async ({ params, auth }) => {
        await deleteProduct(auth.tenantSlug, Number(params.productId), auth.userId)
    })

export default products

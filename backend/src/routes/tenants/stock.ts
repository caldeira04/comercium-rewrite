import { createStockMovement, deleteStockMovements, getStockMovements } from "@/domain/tenant/stock/StockService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const stock = new Elysia({ prefix: "/stock" })
    .use(authPlugin)

    .get("/movements", async ({ query, auth }) => {
        const includeDeleted = query.includeDeleted === "true"
        const products = query.products ? query.products.split(",") : []

        return await getStockMovements(auth.tenantSlug, products, includeDeleted)
    }, {
        query: t.Partial(t.Object({
            includeDeleted: t.String(),
            products: t.String(),
        }))
    })

    .post("/movements", async ({ body, auth }) => {
        return await createStockMovement(auth.tenantSlug, {
            productId: body.productId,
            type: body.type,
            quantity: body.quantity,
            reason: body.reason,
            referenceType: "manual",
            userId: auth.userId,
        })
    }, {
        body: t.Object({
            productId: t.Number(),
            type: t.UnionEnum(["in", "out", "adjustment", "transfer"]),
            quantity: t.Number(),
            reason: t.Optional(t.String()),
        })
    })

    .delete("/movements/:stockMovementId", async ({ params, auth }) => {
        return await deleteStockMovements(auth.tenantSlug, params.stockMovementId, auth.userId)
    }, {
        params: t.Object({
            stockMovementId: t.String()
        })
    })

export default stock

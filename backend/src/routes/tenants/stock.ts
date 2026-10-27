import { createStockMovement, deleteStockMovements, getStockMovements } from "@/domain/tenant/stock/StockService"
import { createStockPurchase } from "@/domain/tenant/payables/StockPurchaseService"
import { assertStockMovementDeletable, paymentMethods } from "@/domain/tenant/payables/PayablesService"
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

    .post("/purchases", async ({ body, auth }) => {
        return await createStockPurchase(auth.tenantSlug, {
            productId: body.productId,
            quantity: body.quantity,
            reason: body.reason,
            payeeId: body.payeeId,
            categoryId: body.categoryId,
            bankAccountId: body.bankAccountId,
            amount: body.amount,
            dueDate: body.dueDate,
            paymentMethod: body.paymentMethod,
            notes: body.notes,
            installments: body.installments,
            createPayable: body.createPayable,
            userId: auth.userId,
            timeZone: auth.tenantTimezone,
        })
    }, {
        body: t.Object({
            productId: t.Number(),
            quantity: t.Number(),
            reason: t.Optional(t.String()),
            createPayable: t.Boolean(),
            payeeId: t.Optional(t.Nullable(t.String())),
            categoryId: t.Optional(t.Nullable(t.String())),
            bankAccountId: t.Optional(t.Nullable(t.String())),
            amount: t.Optional(t.Number()),
            dueDate: t.Optional(t.String()),
            paymentMethod: t.Optional(t.Nullable(t.UnionEnum(paymentMethods))),
            notes: t.Optional(t.Nullable(t.String())),
            installments: t.Optional(t.Object({
                count: t.Optional(t.Number()),
                mode: t.Optional(t.UnionEnum(["recurring", "installment"])),
            })),
        })
    })

    .delete("/movements/:stockMovementId", async ({ params, auth }) => {
        await assertStockMovementDeletable(auth.tenantSlug, params.stockMovementId)

        return await deleteStockMovements(auth.tenantSlug, params.stockMovementId, auth.userId)
    }, {
        params: t.Object({
            stockMovementId: t.String()
        })
    })

export default stock

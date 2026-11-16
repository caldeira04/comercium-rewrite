import { addProductToSale, cancelSale, createSale, currentSale, getSales, type PaymentMethod, reactivateProductFromSale, removeProductFromSale, settleSale, updateSaleClient, updateSaleItem } from "@/domain/tenant/sales/SalesService";
import { authPlugin } from "@/utils/elysia";
import { dateRangeQuery, parseClientId } from "../../utils/reportFilters";
import { AppError } from "../../utils/errors";
import Elysia, { t } from "elysia";

const PAYMENT_METHODS = ["cash", "pix", "debit", "credit", "voucher"] as const satisfies readonly PaymentMethod[]

function parsePaymentMethod(value?: string) {
    if (!value || value === "all") return undefined

    const method = PAYMENT_METHODS.find((entry) => entry === value)
    if (!method) throw new AppError("forma de pagamento inválida", 400, "INVALID_PAYMENT_METHOD")

    return method
}

const sales = new Elysia({ prefix: "/sales" })
    .use(authPlugin)

    .get("/", async ({ auth, query }) => {
        return await getSales(auth.tenantSlug, {
            includeDeleted: query.includeDeleted === "true",
            startDate: query.startDate,
            endDate: query.endDate,
            clientId: parseClientId(query.clientId),
            paymentMethod: parsePaymentMethod(query.paymentMethod),
            timeZone: auth.tenantTimezone,
        })
    }, {
        query: t.Object({
            ...dateRangeQuery,
            includeDeleted: t.Optional(t.String()),
            clientId: t.Optional(t.String()),
            paymentMethod: t.Optional(t.String()),
        })
    })

    .get("/current", async ({ auth, query }) => {
        const includeDeleted = query.includeDeleted === "true"
        const sale = await currentSale(auth.tenantSlug, includeDeleted)

        return sale
    }, {
        query: t.Partial(
            t.Object({
                includeDeleted: t.String()
            })
        )
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
            discount: body.discount,
            unitPrice: body.unitPrice
        })

        return added
    }, {
        params: t.Object({
            productId: t.Number(),
        }),
        body: t.Object({
            quantity: t.Number(),
            discount: t.Number(),
            unitPrice: t.Optional(t.Number()),
        })
    })

    .patch("/sale-item/:saleItemId", async ({ params, body, auth }) => {
        const updated = await updateSaleItem(auth.tenantSlug, {
            saleItemId: params.saleItemId,
            userId: auth.userId,
            quantity: body.quantity,
            discount: body.discount,
            unitPrice: body.unitPrice
        })

        return updated
    }, {
        params: t.Object({
            saleItemId: t.String(),
        }),
        body: t.Object({
            quantity: t.Number(),
            discount: t.Number(),
            unitPrice: t.Optional(t.Number()),
        })
    })

    .delete("/sale-item/:saleItemId", async ({ params, body, auth }) => {
        const deleted = await removeProductFromSale(auth.tenantSlug, {
            saleItemId: params.saleItemId,
            userId: auth.userId,
            deleteReason: body.deleteReason ?? "remoção manual"
        })

        return deleted
    }, {
        params: t.Object({
            saleItemId: t.String(),
        }),
        body: t.Object({
            deleteReason: t.Optional(t.String()),
        })
    })

    .patch("/sale-item/:saleItemId/reactivate", async ({ params, auth }) => {
        const reactivated = await reactivateProductFromSale(auth.tenantSlug, {
            saleItemId: params.saleItemId,
            userId: auth.userId,
        })

        return reactivated
    }, {
        params: t.Object({
            saleItemId: t.String(),
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

    .post("/:id/cancel", async ({ auth, params }) => {
        const cancelled = await cancelSale(auth.tenantSlug, {
            userId: auth.userId,
            saleId: params.id
        })

        return cancelled
    }, {
        params: t.Object({
            id: t.String()
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

import { closeCash, createCash, createCashMovement, currentCash, getCashes } from "@/domain/tenant/cash/CashService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const cash = new Elysia({ prefix: "/cash" })
    .use(authPlugin)

    .get("/", async ({ auth }) => {
        return await getCashes(auth.tenantSlug)
    })

    .get("/current", async ({ auth }) => {
        const cash = await currentCash(auth.tenantSlug)
        return cash
    })

    .patch("/:cashId/close", async ({ body, params, auth }) => {
        return await closeCash(auth.tenantSlug, {
            cashId: params.cashId,
            actualClosingAmount: body.actualClosingAmount,
            userId: auth.userId,
        })
    }, {
        body: t.Object({
            actualClosingAmount: t.Number()
        }),
        params: t.Object({
            cashId: t.String()
        })
    })

    .post("/", async ({ body, auth }) => {
        const opened = await createCash(auth.tenantSlug, {
            openingAmount: body.openingAmount,
            userId: auth.userId
        })

        return opened
    }, {
        body: t.Object({
            openingAmount: t.Number()
        })
    })

    .post("/movement/:cashId", async ({ body, auth, params }) => {
        const { amount, description, type } = body
        const movement = await createCashMovement(auth.tenantSlug, {
            amount,
            cashId: params.cashId,
            nature: type === "topup" ? "in" : "out",
            userId: auth.userId,
            referenceType: "manual",
            type,
            description
        })

        return movement
    }, {
        body: t.Object({
            amount: t.Number(),
            description: t.String(),
            type: t.UnionEnum(["topup", "drop"])
        }),
        params: t.Object({
            cashId: t.String()
        })
    })

export default cash

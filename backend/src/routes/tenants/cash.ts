import { createCash, currentCash } from "@/domain/tenant/cash/CashService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const cash = new Elysia({ prefix: "/cash" })
    .use(authPlugin)

    .get("/current", async ({ auth }) => {
        const cash = await currentCash(auth.tenantSlug)
        return cash
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

export default cash

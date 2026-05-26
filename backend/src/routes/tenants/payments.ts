import { createPayment } from "@/domain/tenant/payment/PaymentsService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const payment = new Elysia({ prefix: "/payments" })
    .use(authPlugin)
    .post("/:saleId", async ({ body, params, auth }) => {
        const payment = await createPayment(auth.tenantSlug, {
            paidAmount: body.paidAmount,
            totalAmount: body.totalAmount,
            saleId: params.saleId,
            userId: auth.userId,
            paymentMethod: body.paymentMethod
        })

        return payment
    }, {
        params: t.Object({
            saleId: t.String()
        }),
        body: t.Object({
            totalAmount: t.Number(),
            paidAmount: t.Number(),
            paymentMethod: t.UnionEnum(["cash", "pix", "debit", "credit", "voucher"])
        })
    })

export default payment

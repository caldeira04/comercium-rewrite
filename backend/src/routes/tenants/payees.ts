import {
    createPayee,
    deletePayee,
    getPayees,
    payeeKinds,
    updatePayee,
    type PayeeKind,
} from "@/domain/tenant/payables/PayeesService"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const payeeBody = t.Object({
    name: t.String(),
    kind: t.Optional(t.UnionEnum(payeeKinds)),
    document: t.Optional(t.Nullable(t.String())),
    phone: t.Optional(t.Nullable(t.String())),
    email: t.Optional(t.Nullable(t.String())),
})

const payees = new Elysia({ prefix: "/payees" })
    .use(authPlugin)

    .get("/", async ({ auth, query }) => {
        return await getPayees(auth.tenantSlug, {
            includeDeleted: query.includeDeleted === "true",
        })
    }, {
        query: t.Partial(t.Object({
            includeDeleted: t.String(),
        })),
    })

    .post("/", async ({ body, auth }) => {
        return await createPayee(auth.tenantSlug, {
            name: body.name,
            kind: body.kind as PayeeKind | undefined,
            document: body.document,
            phone: body.phone,
            email: body.email,
            userId: auth.userId,
        })
    }, {
        body: payeeBody,
    })

    .patch("/:payeeId", async ({ body, params, auth }) => {
        return await updatePayee(auth.tenantSlug, {
            payeeId: params.payeeId,
            name: body.name,
            kind: body.kind as PayeeKind | undefined,
            document: body.document,
            phone: body.phone,
            email: body.email,
            userId: auth.userId,
        })
    }, {
        body: payeeBody,
        params: t.Object({
            payeeId: t.String(),
        }),
    })

    .delete("/:payeeId", async ({ params, auth }) => {
        return await deletePayee(auth.tenantSlug, params.payeeId, auth.userId)
    }, {
        params: t.Object({
            payeeId: t.String(),
        }),
    })

export default payees

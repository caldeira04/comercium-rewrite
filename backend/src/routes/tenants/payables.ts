import {
    createPayable,
    deletePayable,
    exportPayables,
    getPayables,
    payPayable,
    payableStatuses,
    paymentMethods,
    reversePayable,
    updatePayable,
    type PaymentMethod,
    type PayableStatus,
} from "@/domain/tenant/payables/PayablesService"
import { AppError } from "../../utils/errors"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const payablesQuery = t.Object({
    startDate: t.String(),
    endDate: t.String(),
    payeeId: t.Optional(t.String()),
    bankAccountId: t.Optional(t.String()),
    categoryId: t.Optional(t.String()),
    status: t.Optional(t.String()),
    page: t.Optional(t.String()),
    pageSize: t.Optional(t.String()),
})

const paymentMethodSchema = t.UnionEnum(paymentMethods)

const installmentsSchema = t.Object({
    count: t.Optional(t.Number()),
    mode: t.Optional(t.UnionEnum(["recurring", "installment"])),
})

const createBody = t.Object({
    description: t.String(),
    amount: t.Number(),
    dueDate: t.String(),
    paymentMethod: t.Optional(t.Nullable(paymentMethodSchema)),
    payeeId: t.Optional(t.Nullable(t.String())),
    categoryId: t.Optional(t.Nullable(t.String())),
    bankAccountId: t.Optional(t.Nullable(t.String())),
    notes: t.Optional(t.Nullable(t.String())),
    installments: t.Optional(installmentsSchema),
})

const updateBody = t.Object({
    description: t.Optional(t.String()),
    amount: t.Optional(t.Number()),
    dueDate: t.Optional(t.String()),
    paymentMethod: t.Optional(t.Nullable(paymentMethodSchema)),
    payeeId: t.Optional(t.Nullable(t.String())),
    categoryId: t.Optional(t.Nullable(t.String())),
    bankAccountId: t.Optional(t.Nullable(t.String())),
    notes: t.Optional(t.Nullable(t.String())),
})

function parseReferenceId(value?: string) {
    if (!value || value === "all") return undefined
    if (value === "none") return "none"

    return value
}

function parseStatus(value?: string): PayableStatus {
    if (!value || value === "all") return "all"

    if (payableStatuses.includes(value as PayableStatus)) {
        return value as PayableStatus
    }

    throw new AppError("situação inválida", 400, "INVALID_STATUS")
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
    if (!value) return fallback

    const parsed = Number(value)

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const payables = new Elysia({ prefix: "/payables" })
    .use(authPlugin)

    .get("/", async ({ auth, query }) => {
        const result = await getPayables(auth.tenantSlug, {
            startDate: query.startDate,
            endDate: query.endDate,
            payeeId: parseReferenceId(query.payeeId),
            bankAccountId: parseReferenceId(query.bankAccountId),
            categoryId: parseReferenceId(query.categoryId),
            status: parseStatus(query.status),
            page: parsePositiveInteger(query.page, 1),
            pageSize: parsePositiveInteger(query.pageSize, 20),
            timeZone: auth.tenantTimezone,
        })

        return {
            ...result,
            tenantName: auth.tenantName,
        }
    }, {
        query: payablesQuery,
    })

    .get("/export", async ({ auth, query }) => {
        const result = await exportPayables(auth.tenantSlug, {
            startDate: query.startDate,
            endDate: query.endDate,
            payeeId: parseReferenceId(query.payeeId),
            bankAccountId: parseReferenceId(query.bankAccountId),
            categoryId: parseReferenceId(query.categoryId),
            status: parseStatus(query.status),
            timeZone: auth.tenantTimezone,
        })

        return {
            ...result,
            tenantName: auth.tenantName,
        }
    }, {
        query: payablesQuery,
    })

    .post("/", async ({ body, auth }) => {
        return await createPayable(auth.tenantSlug, {
            description: body.description,
            amount: body.amount,
            dueDate: body.dueDate,
            paymentMethod: body.paymentMethod,
            payeeId: body.payeeId,
            categoryId: body.categoryId,
            bankAccountId: body.bankAccountId,
            notes: body.notes,
            installments: body.installments,
            userId: auth.userId,
        })
    }, {
        body: createBody,
    })

    .patch("/:payableId", async ({ body, params, auth }) => {
        return await updatePayable(auth.tenantSlug, {
            payableId: params.payableId,
            description: body.description,
            amount: body.amount,
            dueDate: body.dueDate,
            paymentMethod: body.paymentMethod as PaymentMethod | null | undefined,
            payeeId: body.payeeId,
            categoryId: body.categoryId,
            bankAccountId: body.bankAccountId,
            notes: body.notes,
            userId: auth.userId,
        })
    }, {
        body: updateBody,
        params: t.Object({
            payableId: t.String(),
        }),
    })

    .post("/:payableId/pay", async ({ body, params, auth }) => {
        return await payPayable(auth.tenantSlug, {
            payableId: params.payableId,
            paidDate: body.paidDate,
            bankAccountId: body.bankAccountId,
            paymentMethod: body.paymentMethod as PaymentMethod | null | undefined,
            userId: auth.userId,
            timeZone: auth.tenantTimezone,
        })
    }, {
        body: t.Object({
            paidDate: t.String(),
            bankAccountId: t.Optional(t.Nullable(t.String())),
            paymentMethod: t.Optional(t.Nullable(paymentMethodSchema)),
        }),
        params: t.Object({
            payableId: t.String(),
        }),
    })

    .post("/:payableId/reverse", async ({ params, auth }) => {
        return await reversePayable(auth.tenantSlug, {
            payableId: params.payableId,
            userId: auth.userId,
        })
    }, {
        params: t.Object({
            payableId: t.String(),
        }),
    })

    .delete("/:payableId", async ({ params, query, auth }) => {
        const scope = query.scope === "group" ? "group" : "single"

        return await deletePayable(auth.tenantSlug, {
            payableId: params.payableId,
            userId: auth.userId,
            scope,
        })
    }, {
        params: t.Object({
            payableId: t.String(),
        }),
        query: t.Object({
            scope: t.Optional(t.String()),
        }),
    })

export default payables

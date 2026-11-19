import {
    exportReceivables,
    getReceivables,
    type ReceivableStatusFilter,
} from "@/domain/tenant/receivables/ReceivablesService"
import { AppError } from "../../utils/errors"
import { cashIdQuery, dateRangeQuery, parseCashId, parseClientId } from "../../utils/reportFilters"
import { authPlugin } from "@/utils/elysia"
import Elysia, { t } from "elysia"

const receivablesQuery = t.Object({
    ...dateRangeQuery,
    ...cashIdQuery,
    clientId: t.Optional(t.String()),
    status: t.Optional(t.String()),
    page: t.Optional(t.String()),
    pageSize: t.Optional(t.String()),
})

function parseStatus(value?: string): ReceivableStatusFilter {
    if (!value || value === "paid") return "paid"
    if (value === "refunded" || value === "all") return value

    throw new AppError("situação inválida", 400, "INVALID_STATUS")
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
    if (!value) return fallback

    const parsed = Number(value)

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const receivables = new Elysia({ prefix: "/receivables" })
    .use(authPlugin)

    .get("/", async ({ auth, query }) => {
        const result = await getReceivables(auth.tenantSlug, {
            startDate: query.startDate,
            endDate: query.endDate,
            cashId: parseCashId(query.cashId),
            clientId: parseClientId(query.clientId),
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
        query: receivablesQuery,
    })

    .get("/export", async ({ auth, query }) => {
        const result = await exportReceivables(auth.tenantSlug, {
            startDate: query.startDate,
            endDate: query.endDate,
            cashId: parseCashId(query.cashId),
            clientId: parseClientId(query.clientId),
            status: parseStatus(query.status),
            timeZone: auth.tenantTimezone,
        })

        return {
            ...result,
            tenantName: auth.tenantName,
        }
    }, {
        query: receivablesQuery,
    })

export default receivables

import { getTenantDb } from "@/db/db"
import { client, payment, sale } from "@/db/schema/tenant"
import { and, count, desc, eq, gte, isNull, lt, sum, type SQL } from "drizzle-orm"
import { AppError } from "../../../utils/errors"
import { isValidDateInput, localDateRangeToUtc, normalizeTimeZone } from "../../../utils/dates"

export type ReceivableStatusFilter = "paid" | "refunded" | "all"
export type ReceivableClientFilter = number | "none" | undefined

export type ReceivableFilters = {
    startDate: string
    endDate: string
    clientId?: ReceivableClientFilter
    status?: ReceivableStatusFilter
    page?: number
    pageSize?: number
    timeZone?: string | null
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const EXPORT_LIMIT = 5000

function buildConditions(filters: ReceivableFilters, timeZone: string) {
    if (!isValidDateInput(filters.startDate) || !isValidDateInput(filters.endDate)) {
        throw new AppError("data inválida", 400, "INVALID_DATE")
    }

    if (filters.startDate > filters.endDate) {
        throw new AppError("a data inicial não pode ser posterior à data final", 400, "INVALID_DATE_RANGE")
    }

    const { startUtc, endExclusiveUtc } = localDateRangeToUtc(filters.startDate, filters.endDate, timeZone)

    const conditions: SQL[] = [
        gte(payment.paidAt, startUtc),
        lt(payment.paidAt, endExclusiveUtc),
        isNull(sale.deletedAt),
        isNull(sale.cancelledAt),
    ]

    if (filters.clientId === "none") {
        conditions.push(isNull(sale.clientId))
    } else if (typeof filters.clientId === "number") {
        conditions.push(eq(sale.clientId, filters.clientId))
    }

    return conditions
}

function withStatus(conditions: SQL[], status: ReceivableStatusFilter) {
    if (status === "all") return conditions

    return [...conditions, eq(payment.status, status)]
}

function resolvePagination(filters: ReceivableFilters) {
    const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0
        ? filters.page!
        : 1

    const pageSize = Number.isInteger(filters.pageSize) && (filters.pageSize ?? 0) > 0
        ? Math.min(filters.pageSize!, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE

    return { page, pageSize }
}

export async function getReceivables(tenantSlug: string, filters: ReceivableFilters) {
    const db = getTenantDb(tenantSlug)
    const timeZone = normalizeTimeZone(filters.timeZone)
    const status = filters.status ?? "paid"
    const { page, pageSize } = resolvePagination(filters)

    const baseConditions = buildConditions(filters, timeZone)
    const conditions = withStatus(baseConditions, status)

    const rows = await db
        .select({
            id: payment.id,
            paidAt: payment.paidAt,
            amount: payment.amount,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            saleId: sale.id,
            saleCreatedAt: sale.createdAt,
            clientId: client.id,
            clientName: client.name,
        })
        .from(payment)
        .innerJoin(sale, eq(payment.saleId, sale.id))
        .leftJoin(client, eq(sale.clientId, client.id))
        .where(and(...conditions))
        .orderBy(desc(payment.paidAt), desc(payment.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

    const totalRows = await db
        .select({ total: count() })
        .from(payment)
        .innerJoin(sale, eq(payment.saleId, sale.id))
        .leftJoin(client, eq(sale.clientId, client.id))
        .where(and(...conditions))

    const total = totalRows[0]?.total ?? 0

    const statusSummary = await db
        .select({
            status: payment.status,
            amount: sum(payment.amount),
            total: count(),
        })
        .from(payment)
        .innerJoin(sale, eq(payment.saleId, sale.id))
        .leftJoin(client, eq(sale.clientId, client.id))
        .where(and(...conditions))
        .groupBy(payment.status)

    let received = 0
    let refunded = 0

    for (const entry of statusSummary) {
        const amount = Number(entry.amount ?? 0)

        if (entry.status === "paid") received += amount
        if (entry.status === "refunded") refunded += amount
    }

    const methodSummary = await db
        .select({
            method: payment.paymentMethod,
            status: payment.status,
            amount: sum(payment.amount),
            total: count(),
        })
        .from(payment)
        .innerJoin(sale, eq(payment.saleId, sale.id))
        .leftJoin(client, eq(sale.clientId, client.id))
        .where(and(...conditions))
        .groupBy(payment.paymentMethod, payment.status)

    const methods = new Map<
        (typeof payment.paymentMethod.enumValues)[number],
        { method: (typeof payment.paymentMethod.enumValues)[number], count: number, received: number, refunded: number }
    >()

    for (const entry of methodSummary) {
        if (entry.status !== "paid" && entry.status !== "refunded") continue

        const current = methods.get(entry.method)
            ?? { method: entry.method, count: 0, received: 0, refunded: 0 }
        const amount = Number(entry.amount ?? 0)

        methods.set(entry.method, {
            ...current,
            count: current.count + entry.total,
            received: current.received + (entry.status === "paid" ? amount : 0),
            refunded: current.refunded + (entry.status === "refunded" ? amount : 0),
        })
    }

    return {
        rows: rows.map((row) => ({
            id: row.id,
            paidAt: row.paidAt,
            amount: row.amount,
            status: row.status,
            paymentMethod: row.paymentMethod,
            sale: {
                id: row.saleId,
                createdAt: row.saleCreatedAt,
            },
            client: row.clientId === null
                ? null
                : { id: row.clientId, name: row.clientName ?? "" },
        })),
        summary: {
            count: total,
            received,
            refunded,
            net: received - refunded,
        },
        byPaymentMethod: [...methods.values()]
            .sort((a, b) => (b.received + b.refunded) - (a.received + a.refunded)),
        pagination: {
            page,
            pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
        timeZone,
    }
}

export async function exportReceivables(tenantSlug: string, filters: ReceivableFilters) {
    const db = getTenantDb(tenantSlug)
    const timeZone = normalizeTimeZone(filters.timeZone)
    const status = filters.status ?? "paid"

    const baseConditions = buildConditions(filters, timeZone)
    const conditions = withStatus(baseConditions, status)

    const rows = await db
        .select({
            id: payment.id,
            paidAt: payment.paidAt,
            amount: payment.amount,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            saleId: sale.id,
            saleCreatedAt: sale.createdAt,
            clientId: client.id,
            clientName: client.name,
        })
        .from(payment)
        .innerJoin(sale, eq(payment.saleId, sale.id))
        .leftJoin(client, eq(sale.clientId, client.id))
        .where(and(...conditions))
        .orderBy(desc(payment.paidAt), desc(payment.createdAt))
        .limit(EXPORT_LIMIT + 1)

    const statusSummary = await db
        .select({
            status: payment.status,
            amount: sum(payment.amount),
            total: count(),
        })
        .from(payment)
        .innerJoin(sale, eq(payment.saleId, sale.id))
        .leftJoin(client, eq(sale.clientId, client.id))
        .where(and(...conditions))
        .groupBy(payment.status)

    let received = 0
    let refunded = 0
    let total = 0

    for (const entry of statusSummary) {
        const amount = Number(entry.amount ?? 0)
        total += entry.total

        if (entry.status === "paid") received += amount
        if (entry.status === "refunded") refunded += amount
    }

    return {
        rows: rows.slice(0, EXPORT_LIMIT).map((row) => ({
            id: row.id,
            paidAt: row.paidAt,
            amount: row.amount,
            status: row.status,
            paymentMethod: row.paymentMethod,
            sale: {
                id: row.saleId,
                createdAt: row.saleCreatedAt,
            },
            client: row.clientId === null
                ? null
                : { id: row.clientId, name: row.clientName ?? "" },
        })),
        summary: {
            count: total,
            received,
            refunded,
            net: received - refunded,
        },
        truncated: rows.length > EXPORT_LIMIT,
        timeZone,
    }
}

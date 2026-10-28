import { getTenantDb } from "@/db/db"
import { bankAccount, expenseCategory, payable, payee } from "@/db/schema/tenant"
import { and, asc, count, eq, gte, inArray, isNotNull, isNull, lt, lte, sum, type SQL } from "drizzle-orm"
import { AppError } from "../../../utils/errors"
import { addMonthsClamped, isValidDateInput, normalizeTimeZone, todayInTimeZone } from "../../../utils/dates"

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const EXPORT_LIMIT = 5000
const MAX_INSTALLMENTS = 60

export const payableStatuses = ["pending", "paid", "overdue", "all"] as const
export type PayableStatus = (typeof payableStatuses)[number]

export const paymentMethods = ["cash", "pix", "debit", "credit", "voucher"] as const
export type PaymentMethod = (typeof paymentMethods)[number]

export const installmentModes = ["recurring", "installment"] as const
export type InstallmentMode = (typeof installmentModes)[number]

export type PayableStatusComputed = "pending" | "paid" | "overdue"

export type PayableFilters = {
    startDate: string
    endDate: string
    payeeId?: string | "none"
    bankAccountId?: string | "none"
    categoryId?: string | "none"
    status?: PayableStatus
    page?: number
    pageSize?: number
    timeZone?: string | null
}

export type CreatePayableInput = {
    description: string
    amount: number
    dueDate: string
    paymentMethod?: PaymentMethod | null
    payeeId?: string | null
    categoryId?: string | null
    bankAccountId?: string | null
    notes?: string | null
    installments?: { count?: number, mode?: InstallmentMode }
    origin?: "manual" | "stock_purchase"
    stockMovementId?: string | null
    userId: string
}

export type UpdatePayableInput = {
    payableId: string
    userId: string
    description?: string
    amount?: number
    dueDate?: string
    paymentMethod?: PaymentMethod | null
    payeeId?: string | null
    categoryId?: string | null
    bankAccountId?: string | null
    notes?: string | null
}

type TenantDb = ReturnType<typeof getTenantDb>

const rowSelection = {
    id: payable.id,
    description: payable.description,
    amount: payable.amount,
    dueDate: payable.dueDate,
    paidDate: payable.paidDate,
    paymentMethod: payable.paymentMethod,
    notes: payable.notes,
    origin: payable.origin,
    stockMovementId: payable.stockMovementId,
    installmentNumber: payable.installmentNumber,
    installmentCount: payable.installmentCount,
    groupId: payable.groupId,
    payeeId: payee.id,
    payeeName: payee.name,
    payeeKind: payee.kind,
    categoryId: expenseCategory.id,
    categoryName: expenseCategory.name,
    bankAccountId: bankAccount.id,
    bankAccountName: bankAccount.name,
}

type PayableRow = Awaited<ReturnType<typeof fetchRows>>[number]

export function resolvePayableStatus(paidDate: string | null, dueDate: string, today: string): PayableStatusComputed {
    if (paidDate) return "paid"
    if (dueDate < today) return "overdue"

    return "pending"
}

function normalizeDescription(value?: string) {
    const trimmed = value?.trim()

    if (!trimmed) {
        throw new AppError("informe a descrição do lançamento", 400, "INVALID_DESCRIPTION")
    }

    return trimmed
}

function normalizeAmount(value?: number) {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
        throw new AppError("informe um valor válido", 400, "INVALID_AMOUNT")
    }

    return value
}

function normalizeDate(value: string | undefined, label: string) {
    if (!value || !isValidDateInput(value)) {
        throw new AppError(`informe uma data de ${label} válida`, 400, "INVALID_DATE")
    }

    return value
}

function normalizeText(value?: string | null) {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
}

function normalizePaymentMethod(value?: string | null) {
    if (!value) return null

    if (!paymentMethods.includes(value as PaymentMethod)) {
        throw new AppError("forma de pagamento inválida", 400, "INVALID_PAYMENT_METHOD")
    }

    return value as PaymentMethod
}

function normalizeInstallments(input?: { count?: number, mode?: InstallmentMode }) {
    const installmentCount = input?.count ?? 1

    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > MAX_INSTALLMENTS) {
        throw new AppError(`o número de parcelas deve estar entre 1 e ${MAX_INSTALLMENTS}`, 400, "INVALID_INSTALLMENTS")
    }

    const mode = input?.mode ?? "recurring"

    if (!installmentModes.includes(mode)) {
        throw new AppError("modo de repetição inválido", 400, "INVALID_INSTALLMENT_MODE")
    }

    return { count: installmentCount, mode }
}

function splitAmounts(total: number, installmentCount: number, mode: InstallmentMode) {
    if (installmentCount === 1) return [total]

    if (mode === "recurring") {
        // "repetir": cada lançamento recebe o mesmo valor informado.
        return Array.from({ length: installmentCount }, () => total)
    }

    // "parcelar": divide o valor total informado entre as parcelas,
    // distribuindo o resto da divisão nas primeiras parcelas.
    const base = Math.floor(total / installmentCount)
    const remainder = total % installmentCount

    if (base === 0) {
        throw new AppError(
            "o valor total é insuficiente para o número de parcelas",
            400,
            "INVALID_INSTALLMENT_AMOUNT",
        )
    }

    return Array.from(
        { length: installmentCount },
        (_, index) => base + (index < remainder ? 1 : 0),
    )
}

async function assertReferences(db: TenantDb, data: {
    payeeId?: string | null
    categoryId?: string | null
    bankAccountId?: string | null
}) {
    if (data.payeeId) {
        const found = await db.query.payee.findFirst({
            where: (payee, { and, eq, isNull }) => and(eq(payee.id, data.payeeId!), isNull(payee.deletedAt)),
            columns: { id: true },
        })

        if (!found) {
            throw new AppError("favorecido não encontrado", 400, "PAYEE_NOT_FOUND")
        }
    }

    if (data.categoryId) {
        const found = await db.query.expenseCategory.findFirst({
            where: (expenseCategory, { and, eq, isNull }) =>
                and(eq(expenseCategory.id, data.categoryId!), isNull(expenseCategory.deletedAt)),
            columns: { id: true },
        })

        if (!found) {
            throw new AppError("categoria de despesa não encontrada", 400, "EXPENSE_CATEGORY_NOT_FOUND")
        }
    }

    if (data.bankAccountId) {
        const found = await db.query.bankAccount.findFirst({
            where: (bankAccount, { and, eq, isNull }) =>
                and(eq(bankAccount.id, data.bankAccountId!), isNull(bankAccount.deletedAt)),
            columns: { id: true },
        })

        if (!found) {
            throw new AppError("conta bancária não encontrada", 400, "BANK_ACCOUNT_NOT_FOUND")
        }
    }
}

export async function preparePayableRows(db: TenantDb, data: CreatePayableInput) {
    const origin = data.origin ?? "manual"
    const stockMovementId = data.stockMovementId ?? null

    if (origin === "manual" && stockMovementId) {
        throw new AppError("lançamento manual não pode ter movimentação de estoque", 400, "INVALID_ORIGIN")
    }

    if (origin === "stock_purchase" && !stockMovementId) {
        throw new AppError("informe a movimentação de estoque de origem", 400, "INVALID_ORIGIN")
    }

    const installments = normalizeInstallments(data.installments)
    const normalized = {
        description: normalizeDescription(data.description),
        amount: normalizeAmount(data.amount),
        dueDate: normalizeDate(data.dueDate, "vencimento"),
        paymentMethod: normalizePaymentMethod(data.paymentMethod),
        payeeId: data.payeeId ?? null,
        categoryId: data.categoryId ?? null,
        bankAccountId: data.bankAccountId ?? null,
        notes: normalizeText(data.notes),
        origin,
        stockMovementId,
        userId: data.userId,
    }

    await assertReferences(db, normalized)

    if (stockMovementId) {
        const linked = await db
            .select({ id: payable.id })
            .from(payable)
            .where(eq(payable.stockMovementId, stockMovementId))
            .limit(1)

        if (linked[0]) {
            throw new AppError(
                "esta movimentação de estoque já possui lançamento vinculado",
                409,
                "STOCK_MOVEMENT_ALREADY_LINKED",
            )
        }
    }

    const groupId = installments.count > 1 ? crypto.randomUUID() : null
    const amounts = splitAmounts(normalized.amount, installments.count, installments.mode)

    const rows = amounts.map((amount, index) => ({
        description: normalized.description,
        amount,
        dueDate: addMonthsClamped(normalized.dueDate, index),
        paymentMethod: normalized.paymentMethod,
        payeeId: normalized.payeeId,
        categoryId: normalized.categoryId,
        bankAccountId: normalized.bankAccountId,
        notes: normalized.notes,
        origin: normalized.origin,
        stockMovementId: normalized.stockMovementId,
        installmentNumber: index + 1,
        installmentCount: amounts.length,
        groupId,
        createdByUserId: normalized.userId,
        updatedByUserId: normalized.userId,
    })) satisfies (typeof payable.$inferInsert)[]

    return { rows, groupId }
}

export async function createPayable(tenantSlug: string, data: CreatePayableInput) {
    const db = getTenantDb(tenantSlug)
    const { rows, groupId } = await preparePayableRows(db, data)
    const inserted = await db.insert(payable).values(rows).returning()

    return { payables: inserted, groupId }
}

// Lança várias contas numa transação: ou todas entram, ou nenhuma
export async function createPayables(tenantSlug: string, items: CreatePayableInput[]) {
    const db = getTenantDb(tenantSlug)
    const prepared: (typeof payable.$inferInsert)[] = []
    for (const item of items) {
        prepared.push(...(await preparePayableRows(db, item)).rows)
    }

    return await db.transaction(async (tx) => await tx.insert(payable).values(prepared).returning())
}

function buildBaseConditions(filters: PayableFilters) {
    if (!isValidDateInput(filters.startDate) || !isValidDateInput(filters.endDate)) {
        throw new AppError("data inválida", 400, "INVALID_DATE")
    }

    if (filters.startDate > filters.endDate) {
        throw new AppError("a data inicial não pode ser posterior à data final", 400, "INVALID_DATE_RANGE")
    }

    const conditions: SQL[] = [
        isNull(payable.deletedAt),
        gte(payable.dueDate, filters.startDate),
        lte(payable.dueDate, filters.endDate),
    ]

    if (filters.payeeId === "none") {
        conditions.push(isNull(payable.payeeId))
    } else if (filters.payeeId) {
        conditions.push(eq(payable.payeeId, filters.payeeId))
    }

    if (filters.bankAccountId === "none") {
        conditions.push(isNull(payable.bankAccountId))
    } else if (filters.bankAccountId) {
        conditions.push(eq(payable.bankAccountId, filters.bankAccountId))
    }

    if (filters.categoryId === "none") {
        conditions.push(isNull(payable.categoryId))
    } else if (filters.categoryId) {
        conditions.push(eq(payable.categoryId, filters.categoryId))
    }

    return conditions
}

function withStatus(conditions: SQL[], status: PayableStatus, today: string) {
    switch (status) {
        case "paid":
            return [...conditions, isNotNull(payable.paidDate)]
        case "pending":
            return [...conditions, isNull(payable.paidDate), gte(payable.dueDate, today)]
        case "overdue":
            return [...conditions, isNull(payable.paidDate), lt(payable.dueDate, today)]
        default:
            return conditions
    }
}

function resolvePagination(filters: PayableFilters) {
    const page = Number.isInteger(filters.page) && (filters.page ?? 0) > 0
        ? filters.page!
        : 1

    const pageSize = Number.isInteger(filters.pageSize) && (filters.pageSize ?? 0) > 0
        ? Math.min(filters.pageSize!, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE

    return { page, pageSize }
}

async function fetchRows(db: TenantDb, conditions: SQL[], options: { limit: number, offset?: number }) {
    return await db
        .select(rowSelection)
        .from(payable)
        .leftJoin(payee, eq(payable.payeeId, payee.id))
        .leftJoin(expenseCategory, eq(payable.categoryId, expenseCategory.id))
        .leftJoin(bankAccount, eq(payable.bankAccountId, bankAccount.id))
        .where(and(...conditions))
        .orderBy(asc(payable.dueDate), asc(payable.createdAt))
        .limit(options.limit)
        .offset(options.offset ?? 0)
}

async function fetchSummaryEntries(db: TenantDb, conditions: SQL[]) {
    return await db
        .select({
            paidDate: payable.paidDate,
            dueDate: payable.dueDate,
            amount: payable.amount,
        })
        .from(payable)
        .where(and(...conditions))
}

function mapRow(row: PayableRow, today: string) {
    return {
        id: row.id,
        description: row.description,
        amount: row.amount,
        dueDate: row.dueDate,
        paidDate: row.paidDate,
        paymentMethod: row.paymentMethod,
        notes: row.notes,
        origin: row.origin,
        stockMovementId: row.stockMovementId,
        installmentNumber: row.installmentNumber,
        installmentCount: row.installmentCount,
        groupId: row.groupId,
        status: resolvePayableStatus(row.paidDate, row.dueDate, today),
        payee: row.payeeId === null
            ? null
            : { id: row.payeeId, name: row.payeeName ?? "", kind: row.payeeKind ?? "other" },
        category: row.categoryId === null
            ? null
            : { id: row.categoryId, name: row.categoryName ?? "" },
        bankAccount: row.bankAccountId === null
            ? null
            : { id: row.bankAccountId, name: row.bankAccountName ?? "" },
    }
}

function summarize(entries: { paidDate: string | null, dueDate: string, amount: number }[], today: string) {
    const summary = {
        pending: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
    }

    for (const entry of entries) {
        const key = resolvePayableStatus(entry.paidDate, entry.dueDate, today)
        summary[key].count += 1
        summary[key].amount += entry.amount
    }

    return summary
}

export async function getPayables(tenantSlug: string, filters: PayableFilters) {
    const db = getTenantDb(tenantSlug)
    const timeZone = normalizeTimeZone(filters.timeZone)
    const today = todayInTimeZone(timeZone)
    const status = filters.status ?? "all"
    const { page, pageSize } = resolvePagination(filters)

    const baseConditions = buildBaseConditions(filters)
    const conditions = withStatus(baseConditions, status, today)

    const [rows, totals, summaryEntries] = await Promise.all([
        fetchRows(db, conditions, { limit: pageSize, offset: (page - 1) * pageSize }),
        db
            .select({ total: count(), amount: sum(payable.amount) })
            .from(payable)
            .where(and(...conditions)),
        fetchSummaryEntries(db, baseConditions),
    ])

    const total = totals[0]?.total ?? 0

    return {
        rows: rows.map((row) => mapRow(row, today)),
        summary: {
            count: total,
            total: Number(totals[0]?.amount ?? 0),
            ...summarize(summaryEntries, today),
        },
        pagination: {
            page,
            pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
        timeZone,
        today,
    }
}

export async function exportPayables(tenantSlug: string, filters: PayableFilters) {
    const db = getTenantDb(tenantSlug)
    const timeZone = normalizeTimeZone(filters.timeZone)
    const today = todayInTimeZone(timeZone)
    const status = filters.status ?? "all"

    const baseConditions = buildBaseConditions(filters)
    const conditions = withStatus(baseConditions, status, today)

    const [rows, totals, summaryEntries] = await Promise.all([
        fetchRows(db, conditions, { limit: EXPORT_LIMIT + 1 }),
        db
            .select({ total: count(), amount: sum(payable.amount) })
            .from(payable)
            .where(and(...conditions)),
        fetchSummaryEntries(db, baseConditions),
    ])

    return {
        rows: rows.slice(0, EXPORT_LIMIT).map((row) => mapRow(row, today)),
        summary: {
            count: totals[0]?.total ?? 0,
            total: Number(totals[0]?.amount ?? 0),
            ...summarize(summaryEntries, today),
        },
        truncated: rows.length > EXPORT_LIMIT,
        timeZone,
        today,
    }
}

export async function updatePayable(tenantSlug: string, data: UpdatePayableInput) {
    const db = getTenantDb(tenantSlug)
    const existing = await db.query.payable.findFirst({
        where: (payable, { and, eq, isNull }) => and(eq(payable.id, data.payableId), isNull(payable.deletedAt)),
    })

    if (!existing) {
        throw new AppError("lançamento não encontrado", 404, "PAYABLE_NOT_FOUND")
    }

    const next = {
        description: data.description === undefined ? existing.description : normalizeDescription(data.description),
        amount: data.amount === undefined ? existing.amount : normalizeAmount(data.amount),
        dueDate: data.dueDate === undefined ? existing.dueDate : normalizeDate(data.dueDate, "vencimento"),
        paymentMethod: data.paymentMethod === undefined
            ? existing.paymentMethod
            : normalizePaymentMethod(data.paymentMethod),
        payeeId: data.payeeId === undefined ? existing.payeeId : data.payeeId,
        categoryId: data.categoryId === undefined ? existing.categoryId : data.categoryId,
        bankAccountId: data.bankAccountId === undefined ? existing.bankAccountId : data.bankAccountId,
        notes: data.notes === undefined ? existing.notes : normalizeText(data.notes),
    }

    if (existing.paidDate) {
        const locked = next.amount !== existing.amount
            || next.dueDate !== existing.dueDate
            || next.paymentMethod !== existing.paymentMethod
            || next.bankAccountId !== existing.bankAccountId

        if (locked) {
            throw new AppError(
                "estorne a baixa antes de alterar valor, vencimento, forma ou conta",
                409,
                "PAYABLE_IS_PAID",
            )
        }
    }

    await assertReferences(db, next)

    const [updated] = await db.update(payable).set({
        ...next,
        updatedByUserId: data.userId,
    }).where(eq(payable.id, data.payableId)).returning()

    return updated
}

export async function payPayable(tenantSlug: string, data: {
    payableId: string
    userId: string
    paidDate: string
    bankAccountId?: string | null
    paymentMethod?: PaymentMethod | null
    timeZone?: string | null
}) {
    const db = getTenantDb(tenantSlug)
    const existing = await db.query.payable.findFirst({
        where: (payable, { and, eq, isNull }) => and(eq(payable.id, data.payableId), isNull(payable.deletedAt)),
    })

    if (!existing) {
        throw new AppError("lançamento não encontrado", 404, "PAYABLE_NOT_FOUND")
    }

    if (existing.paidDate) {
        throw new AppError("este lançamento já está pago", 409, "PAYABLE_ALREADY_PAID")
    }

    const paidDate = normalizeDate(data.paidDate, "pagamento")
    const today = todayInTimeZone(data.timeZone)

    if (paidDate > today) {
        throw new AppError("a data do pagamento não pode ser futura", 400, "INVALID_PAYMENT_DATE")
    }

    const bankAccountId = data.bankAccountId ?? existing.bankAccountId ?? null

    if (data.bankAccountId !== undefined) {
        await assertReferences(db, { bankAccountId: data.bankAccountId })
    }

    const paymentMethod = data.paymentMethod === undefined
        ? existing.paymentMethod
        : normalizePaymentMethod(data.paymentMethod)

    const [updated] = await db.update(payable).set({
        paidDate,
        bankAccountId,
        paymentMethod,
        updatedByUserId: data.userId,
    }).where(eq(payable.id, data.payableId)).returning()

    return updated
}

export async function reversePayable(tenantSlug: string, data: {
    payableId: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const existing = await db.query.payable.findFirst({
        where: (payable, { and, eq, isNull }) => and(eq(payable.id, data.payableId), isNull(payable.deletedAt)),
    })

    if (!existing) {
        throw new AppError("lançamento não encontrado", 404, "PAYABLE_NOT_FOUND")
    }

    if (!existing.paidDate) {
        throw new AppError("este lançamento não está pago", 409, "PAYABLE_NOT_PAID")
    }

    const [updated] = await db.update(payable).set({
        paidDate: null,
        updatedByUserId: data.userId,
    }).where(eq(payable.id, data.payableId)).returning()

    return updated
}

export async function deletePayable(tenantSlug: string, data: {
    payableId: string
    userId: string
    scope?: "single" | "group"
}) {
    const db = getTenantDb(tenantSlug)
    const existing = await db.query.payable.findFirst({
        where: (payable, { and, eq, isNull }) => and(eq(payable.id, data.payableId), isNull(payable.deletedAt)),
        columns: { id: true, paidDate: true, groupId: true },
    })

    if (!existing) {
        throw new AppError("lançamento não encontrado", 404, "PAYABLE_NOT_FOUND")
    }

    if (existing.paidDate) {
        throw new AppError("estorne a baixa antes de excluir este lançamento", 409, "PAYABLE_IS_PAID")
    }

    const deletedAt = new Date().toISOString().slice(0, 19).replace("T", " ")

    if (data.scope === "group" && existing.groupId) {
        const groupRows = await db.query.payable.findMany({
            where: (payable, { and, eq, isNull }) =>
                and(eq(payable.groupId, existing.groupId!), isNull(payable.deletedAt)),
            columns: { id: true, paidDate: true },
        })

        const paid = groupRows.filter((row) => row.paidDate !== null)
        const unpaidIds = groupRows.filter((row) => row.paidDate === null).map((row) => row.id)

        if (unpaidIds.length > 0) {
            await db.update(payable).set({
                deletedAt,
                deletedByUserId: data.userId,
                updatedByUserId: data.userId,
            }).where(inArray(payable.id, unpaidIds))
        }

        return { deleted: unpaidIds.length, skippedPaid: paid.length }
    }

    await db.update(payable).set({
        deletedAt,
        deletedByUserId: data.userId,
        updatedByUserId: data.userId,
    }).where(eq(payable.id, data.payableId))

    return { deleted: 1, skippedPaid: 0 }
}

export async function getPayablesByStockMovement(tenantSlug: string, stockMovementId: string) {
    const db = getTenantDb(tenantSlug)

    return await db
        .select({ id: payable.id, dueDate: payable.dueDate, amount: payable.amount, paidDate: payable.paidDate })
        .from(payable)
        .where(and(eq(payable.stockMovementId, stockMovementId), isNull(payable.deletedAt)))
}

export async function assertStockMovementDeletable(tenantSlug: string, stockMovementId: string) {
    const db = getTenantDb(tenantSlug)

    const movement = await db.query.stockMovement.findFirst({
        where: (stockMovement, { eq }) => eq(stockMovement.id, stockMovementId),
        columns: { id: true },
    })

    if (!movement) {
        throw new AppError("movimentação de estoque não encontrada", 404, "STOCK_MOVEMENT_NOT_FOUND")
    }

    const linked = await db
        .select({ id: payable.id })
        .from(payable)
        .where(and(eq(payable.stockMovementId, stockMovementId), isNull(payable.deletedAt)))
        .limit(1)

    if (linked[0]) {
        throw new AppError(
            "exclua ou estorne o lançamento vinculado antes de excluir esta movimentação",
            409,
            "STOCK_MOVEMENT_HAS_PAYABLE",
        )
    }

    return movement
}

export type { PayableRow }

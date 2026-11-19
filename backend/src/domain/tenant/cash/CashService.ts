import { db as masterDb, getTenantDb } from "@/db/db"
import { cash, cashMovement } from "@/db/schema/tenant"
import { asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm"
import { resolveDateRangeFilter } from "../../../utils/dates"
import { AppError } from "../../../utils/errors"

type PaymentMethod =
    | "cash"
    | "pix"
    | "debit"
    | "credit"
    | "voucher"

export async function currentCash(tenantSlug: string) {
    const db = getTenantDb(tenantSlug)

    const currentCash = await db.query.cash.findFirst({
        orderBy: [desc(cash.createdAt)],
        columns: {
            actualClosingAmount: true,
            id: true,
            number: true,
            closedAt: true,
            closedByUserId: true,
            createdAt: true,
            createdByUserId: true,
            updatedAt: true,
            updatedByUserId: true,
            openingAmount: true,
            expectedClosingAmount: true,
        },
        with: {
            cashMovements: {
                columns: {
                    id: true,
                    amount: true,
                    nature: true,
                    createdAt: true,
                    createdByUserId: true,
                    description: true,
                    referenceId: true,
                    referenceType: true,
                    type: true,
                },
                orderBy: [desc(cashMovement.createdAt)],
            },
            sales: {
                columns: {
                    id: true,
                },
                with: {
                    payment: {
                        columns: {
                            id: true,
                            amount: true,
                            paymentMethod: true,
                            createdAt: true,
                            saleId: true
                        },
                        where: (payment, { eq }) => eq(payment.status, "paid")
                    }
                }
            }
        },
    })

    if (!currentCash) return null

    const userIds = [
        currentCash.createdByUserId,
        currentCash.updatedByUserId,
        currentCash.closedByUserId,
        ...currentCash.cashMovements.map((m) => m.createdByUserId),
    ].filter(Boolean) as string[]

    const uniqueUserIds = [...new Set(userIds)]

    const users = uniqueUserIds.length
        ? await masterDb.query.tenantUser.findMany({
            columns: {
                id: true,
                login: true,
            },
            where: (tenantUser, { inArray }) =>
                inArray(tenantUser.id, uniqueUserIds),
        })
        : []

    const usersById = new Map(users.map((user) => [user.id, user]))

    const paymentSummary = Object.entries(
        (currentCash.sales ?? [])
            .flatMap((sale) => sale.payment)
            .reduce<
                Record<
                    PaymentMethod,
                    {
                        amount: number
                        salesCount: number
                    }
                >
            >(
                (acc, payment) => {
                    acc[payment.paymentMethod].amount += payment.amount
                    acc[payment.paymentMethod].salesCount += 1

                    return acc
                },
                {
                    cash: {
                        amount: 0,
                        salesCount: 0,
                    },

                    pix: {
                        amount: 0,
                        salesCount: 0,
                    },

                    debit: {
                        amount: 0,
                        salesCount: 0,
                    },

                    credit: {
                        amount: 0,
                        salesCount: 0,
                    },

                    voucher: {
                        amount: 0,
                        salesCount: 0,
                    },
                }
            )
    ).map(([method, data]) => ({
        method,
        amount: data.amount,
        salesCount: data.salesCount,
    }))

    const inflow = currentCash.cashMovements
        .filter((m) => m.nature === "in")
        .reduce((sum, m) => sum + m.amount, 0)

    const outflow = currentCash.cashMovements
        .filter((m) => m.nature === "out")
        .reduce((sum, m) => sum + m.amount, 0)

    const expectedClosingAmount =
        currentCash.expectedClosingAmount ?? inflow - outflow

    const difference =
        currentCash.actualClosingAmount !== null
            ? currentCash.actualClosingAmount - expectedClosingAmount
            : null

    const movements = currentCash.cashMovements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        nature: movement.nature,
        amount: movement.amount,
        signedAmount:
            movement.nature === "in"
                ? movement.amount
                : -movement.amount,
        description: movement.description,
        reference: movement.referenceId
            ? {
                type: movement.referenceType,
                id: movement.referenceId,
            }
            : null,
        createdAt: movement.createdAt,
        createdByUser: movement.createdByUserId
            ? usersById.get(movement.createdByUserId) ?? null
            : null,
    }))

    const { sales, cashMovements, ...cashData } = currentCash

    return {
        id: cashData.id,
        number: cashData.number,

        status: cashData.closedAt ? "closed" : "open",

        openedAt: cashData.createdAt,
        closedAt: cashData.closedAt,

        amounts: {
            opening: cashData.openingAmount,
            inflow,
            outflow,
            expectedClosing: expectedClosingAmount,
            actualClosing: cashData.actualClosingAmount,
            difference,
        },

        users: {
            createdBy: cashData.createdByUserId
                ? usersById.get(cashData.createdByUserId) ?? null
                : null,

            updatedBy: cashData.updatedByUserId
                ? usersById.get(cashData.updatedByUserId) ?? null
                : null,

            closedBy: cashData.closedByUserId
                ? usersById.get(cashData.closedByUserId) ?? null
                : null,
        },

        paymentSummary,

        movementSummary: {
            totalCount: movements.length,
            inCount: movements.filter((m) => m.nature === "in").length,
            outCount: movements.filter((m) => m.nature === "out").length,
        },

        movements,
    }

}

export type CashFilters = {
    startDate?: string
    endDate?: string
    status?: "open" | "closed"
    /** Quando informado, substitui o período. */
    cashId?: string
    /**
     * "opened" (padrão): caixas abertos no período. "active": caixas que
     * estiveram abertos em algum momento do período (ex.: aberto às 23h e
     * fechado de madrugada conta nos dois dias).
     */
    periodMatch?: "opened" | "active"
    timeZone?: string | null
}

export async function getCashes(tenantSlug: string, filters: CashFilters = {}) {
    const db = getTenantDb(tenantSlug)
    // O período considera a data de abertura do caixa.
    const range = filters.cashId ? null : resolveDateRangeFilter(filters, filters.timeZone)

    const cashes = await db.query.cash.findMany({
        where: (cash, { and, eq, gte, isNotNull, isNull, lt, or }) => {
            const conditions: SQL[] = []

            if (filters.cashId) conditions.push(eq(cash.id, filters.cashId))

            if (range && filters.periodMatch === "active") {
                conditions.push(lt(cash.createdAt, range.endExclusiveUtc))
                conditions.push(or(isNull(cash.closedAt), gte(cash.closedAt, range.startUtc))!)
            } else if (range) {
                conditions.push(gte(cash.createdAt, range.startUtc))
                conditions.push(lt(cash.createdAt, range.endExclusiveUtc))
            }

            if (filters.status === "open") conditions.push(isNull(cash.closedAt))
            if (filters.status === "closed") conditions.push(isNotNull(cash.closedAt))

            return and(...conditions)
        },
        orderBy: [desc(cash.createdAt)],
        columns: {
            actualClosingAmount: true,
            id: true,
            number: true,
            closedAt: true,
            closedByUserId: true,
            createdAt: true,
            createdByUserId: true,
            openingAmount: true,
            expectedClosingAmount: true,
        },
        with: {
            cashMovements: {
                columns: {
                    amount: true,
                    nature: true,
                    type: true,
                },
            },
            sales: {
                columns: {
                    id: true,
                },
                with: {
                    payment: {
                        columns: {
                            amount: true,
                            paymentMethod: true,
                        },
                        where: (payment, { eq }) => eq(payment.status, "paid")
                    }
                }
            }
        },
    })

    const userIds = cashes
        .flatMap((cash) => [cash.createdByUserId, cash.closedByUserId])
        .filter(Boolean) as string[]
    const uniqueUserIds = [...new Set(userIds)]

    const users = uniqueUserIds.length
        ? await masterDb.query.tenantUser.findMany({
            columns: {
                id: true,
                login: true,
            },
            where: (tenantUser, { inArray }) =>
                inArray(tenantUser.id, uniqueUserIds),
        })
        : []

    const usersById = new Map(users.map((user) => [user.id, user]))

    return cashes.map((cashData) => {
        const inflow = cashData.cashMovements
            .filter((movement) => movement.nature === "in")
            .reduce((sum, movement) => sum + movement.amount, 0)
        const outflow = cashData.cashMovements
            .filter((movement) => movement.nature === "out")
            .reduce((sum, movement) => sum + movement.amount, 0)
        const expectedClosing = cashData.expectedClosingAmount ?? inflow - outflow
        const difference = cashData.actualClosingAmount !== null
            ? cashData.actualClosingAmount - expectedClosing
            : null

        return {
            id: cashData.id,
            number: cashData.number,
            status: cashData.closedAt ? "closed" : "open",
            openedAt: cashData.createdAt,
            closedAt: cashData.closedAt,
            amounts: {
                opening: cashData.openingAmount,
                inflow,
                outflow,
                expectedClosing,
                actualClosing: cashData.actualClosingAmount,
                difference,
            },
            users: {
                createdBy: cashData.createdByUserId
                    ? usersById.get(cashData.createdByUserId) ?? null
                    : null,
                closedBy: cashData.closedByUserId
                    ? usersById.get(cashData.closedByUserId) ?? null
                    : null,
            },
            paymentSummary: Object.entries(
                (cashData.sales ?? [])
                    .flatMap((sale) => sale.payment)
                    .reduce<Record<PaymentMethod, { amount: number, salesCount: number }>>((acc, payment) => {
                        acc[payment.paymentMethod].amount += payment.amount
                        acc[payment.paymentMethod].salesCount += 1
                        return acc
                    }, {
                        cash: { amount: 0, salesCount: 0 },
                        pix: { amount: 0, salesCount: 0 },
                        debit: { amount: 0, salesCount: 0 },
                        credit: { amount: 0, salesCount: 0 },
                        voucher: { amount: 0, salesCount: 0 },
                    })
            ).map(([method, data]) => ({ method, ...data })),
            movementSummary: {
                totalCount: cashData.cashMovements.length,
                inCount: cashData.cashMovements.filter((movement) => movement.nature === "in").length,
                outCount: cashData.cashMovements.filter((movement) => movement.nature === "out").length,
            },
        }
    })
}

export async function createCash(tenantSlug: string, data: {
    openingAmount: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { openingAmount, userId } = data

    const transaction = await db.transaction(async (tx) => {
        const [newCash] = await tx.insert(cash).values({
            number: sql`(SELECT COALESCE(MAX(${cash.number}), 0) + 1 FROM ${cash})`,
            openingAmount,
            createdByUserId: userId,
            updatedByUserId: userId
        }).returning()

        await tx.insert(cashMovement).values({
            amount: openingAmount,
            cashId: newCash.id,
            nature: "in",
            type: "open"
        })

        return newCash
    })

    return transaction
}

export async function closeCash(tenantSlug: string, data: {
    cashId: string,
    actualClosingAmount: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { cashId, actualClosingAmount, userId } = data

    const closing = await db.transaction(async (tx) => {
        const cashMoves = await tx.query.cashMovement.findMany({
            where: (cashMoves, { eq }) => eq(cashMoves.cashId, cashId)
        })

        const expectedClosingAmount = cashMoves.reduce((acc, value) => (
            value.nature === "in" ? acc + value.amount : acc - value.amount
        ), 0)

        const close = await tx.update(cash).set({
            expectedClosingAmount,
            actualClosingAmount,
            closedAt: sql`(CURRENT_TIMESTAMP)`,
            closedByUserId: userId,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedByUserId: userId
        })
            .where(eq(cash.id, cashId))

        return close
    })

    return closing
}

export async function createCashMovement(tenantSlug: string, data: {
    cashId: string,
    nature: "in" | "out"
    type: "payment" | "drop" | "topup" | "open" | "refund"
    amount: number
    description?: string
    referenceType?: "payment" | "purchase" | "refund" | "manual"
    referenceId?: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { cashId, nature, type, amount, description, referenceType, referenceId, userId } = data

    const [newCashMovement] = await db.insert(cashMovement).values({
        cashId,
        nature,
        type,
        amount,
        description,
        referenceType,
        referenceId,
        createdByUserId: userId,
        updatedByUserId: userId
    }).returning()

    return newCashMovement
}

async function loadUserLogins(userIds: Array<string | null | undefined>) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean) as string[])]

    const users = uniqueUserIds.length
        ? await masterDb.query.tenantUser.findMany({
            columns: { id: true, login: true },
            where: (tenantUser, { inArray }) => inArray(tenantUser.id, uniqueUserIds),
        })
        : []

    return new Map(users.map((user) => [user.id, user.login]))
}

// Agrupa itens do mesmo produto (lançados em linhas separadas na venda),
// mantendo a ordem em que apareceram.
function groupSaleItems(items: Array<{ quantity: number, totalPrice: number, product: { id: number, name: string } }>) {
    const grouped = new Map<number, { name: string, quantity: number, totalPrice: number }>()

    for (const item of items) {
        const current = grouped.get(item.product.id)

        if (current) {
            current.quantity += item.quantity
            current.totalPrice += item.totalPrice
        } else {
            grouped.set(item.product.id, { name: item.product.name, quantity: item.quantity, totalPrice: item.totalPrice })
        }
    }

    return [...grouped.values()]
}

// Lista enxuta para o filtro "caixa" dos relatórios.
export async function getCashOptions(tenantSlug: string) {
    const db = getTenantDb(tenantSlug)

    const cashes = await db.query.cash.findMany({
        columns: {
            id: true,
            number: true,
            createdAt: true,
            closedAt: true,
            createdByUserId: true,
        },
        orderBy: [desc(cash.number)],
    })

    const logins = await loadUserLogins(cashes.map((entry) => entry.createdByUserId))

    return cashes.map((entry) => ({
        id: entry.id,
        number: entry.number,
        openedAt: entry.createdAt,
        closedAt: entry.closedAt,
        operator: entry.createdByUserId ? logins.get(entry.createdByUserId) ?? null : null,
    }))
}

// Extrato de um caixa: todas as entradas e saídas em ordem cronológica, com o
// saldo acumulado e o contexto de cada lançamento (venda, cliente, itens).
export async function getCashMovements(tenantSlug: string, cashId: string) {
    const db = getTenantDb(tenantSlug)

    const cashData = await db.query.cash.findFirst({
        where: (entry, { eq }) => eq(entry.id, cashId),
        columns: {
            id: true,
            number: true,
            openingAmount: true,
            expectedClosingAmount: true,
            actualClosingAmount: true,
            createdAt: true,
            createdByUserId: true,
            closedAt: true,
            closedByUserId: true,
        },
    })

    if (!cashData) throw new AppError("caixa não encontrado", 404, "CASH_NOT_FOUND")

    const movements = await db
        .select({
            id: cashMovement.id,
            createdAt: cashMovement.createdAt,
            createdByUserId: cashMovement.createdByUserId,
            nature: cashMovement.nature,
            type: cashMovement.type,
            amount: cashMovement.amount,
            description: cashMovement.description,
            referenceType: cashMovement.referenceType,
            referenceId: cashMovement.referenceId,
        })
        .from(cashMovement)
        .where(eq(cashMovement.cashId, cashId))
        .orderBy(asc(cashMovement.createdAt), sql`${cashMovement}.rowid`)

    // Pagamentos e estornos apontam para o pagamento; carregamos as vendas em lote
    const paymentIds = movements
        .filter((movement) => movement.referenceId
            && (movement.referenceType === "payment" || movement.referenceType === "refund"))
        .map((movement) => movement.referenceId as string)

    const payments = paymentIds.length
        ? await db.query.payment.findMany({
            where: (entry) => inArray(entry.id, [...new Set(paymentIds)]),
            columns: { id: true, paymentMethod: true, saleId: true },
        })
        : []

    const saleIds = [...new Set(payments.map((entry) => entry.saleId))]
    const sales = saleIds.length
        ? await db.query.sale.findMany({
            where: (entry) => inArray(entry.id, saleIds),
            columns: { id: true, number: true, totalAmount: true },
            with: {
                client: { columns: { id: true, name: true } },
                saleItem: {
                    columns: { quantity: true, totalPrice: true },
                    where: (item, { isNull }) => isNull(item.deletedAt),
                    with: { product: { columns: { id: true, name: true } } },
                },
            },
        })
        : []

    const paymentsById = new Map(payments.map((entry) => [entry.id, entry]))
    const salesById = new Map(sales.map((entry) => [entry.id, entry]))
    const logins = await loadUserLogins([
        cashData.createdByUserId,
        cashData.closedByUserId,
        ...movements.map((movement) => movement.createdByUserId),
    ])

    let balance = 0
    let inflow = 0
    let outflow = 0

    const rows = movements.map((movement) => {
        if (movement.nature === "in") {
            balance += movement.amount
            inflow += movement.amount
        } else {
            balance -= movement.amount
            outflow += movement.amount
        }

        const linkedPayment = movement.referenceId ? paymentsById.get(movement.referenceId) : undefined
        const linkedSale = linkedPayment ? salesById.get(linkedPayment.saleId) : undefined
        // A abertura é gravada sem usuário; vale quem abriu o caixa
        const userId = movement.createdByUserId
            ?? (movement.type === "open" ? cashData.createdByUserId : null)

        return {
            id: movement.id,
            createdAt: movement.createdAt,
            nature: movement.nature,
            type: movement.type,
            amount: movement.amount,
            balance,
            description: movement.description,
            user: userId ? logins.get(userId) ?? null : null,
            paymentMethod: linkedPayment?.paymentMethod ?? null,
            sale: linkedSale
                ? {
                    id: linkedSale.id,
                    number: linkedSale.number,
                    totalAmount: linkedSale.totalAmount,
                    client: linkedSale.client,
                    items: groupSaleItems(linkedSale.saleItem),
                }
                : null,
        }
    })

    const expectedClosing = cashData.expectedClosingAmount ?? balance

    return {
        cash: {
            id: cashData.id,
            number: cashData.number,
            status: cashData.closedAt ? "closed" as const : "open" as const,
            openedAt: cashData.createdAt,
            closedAt: cashData.closedAt,
            openedBy: cashData.createdByUserId ? logins.get(cashData.createdByUserId) ?? null : null,
            closedBy: cashData.closedByUserId ? logins.get(cashData.closedByUserId) ?? null : null,
        },
        movements: rows,
        totals: {
            inflow,
            outflow,
            balance,
            expectedClosing,
            actualClosing: cashData.actualClosingAmount,
            difference: cashData.actualClosingAmount !== null
                ? cashData.actualClosingAmount - expectedClosing
                : null,
        },
    }
}

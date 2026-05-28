import { db as masterDb, getTenantDb } from "@/db/db"
import { cash, cashMovement } from "@/db/schema/tenant"
import { desc, sql } from "drizzle-orm"

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
        currentCash.sales
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

export async function createCash(tenantSlug: string, data: {
    openingAmount: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { openingAmount, userId } = data

    const transaction = await db.transaction(async (tx) => {
        const [newCash] = await tx.insert(cash).values({
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
            where: (cashMoves, { eq }) => eq(cashMoves.id, cashId)
        })

        const expectedClosingAmount = cashMoves.reduce((acc, value) => acc + value.amount, 0)

        const close = await tx.update(cash).set({
            expectedClosingAmount,
            actualClosingAmount,
            closedAt: sql`(CURRENT_TIMESTAMP)`,
            closedByUserId: userId,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedByUserId: userId
        })

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

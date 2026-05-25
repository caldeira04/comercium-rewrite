import { getTenantDb } from "@/db/db"
import { cash, cashMovement } from "@/db/schema/tenant"
import { desc, sql } from "drizzle-orm"

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
            expectedClosingAmount: true
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
                    type: true
                }
            }
        },
    })

    if (!currentCash) return null

    return currentCash
}

export async function createCash(tenantSlug: string, data: {
    openingAmount: number,
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { openingAmount, userId } = data

    const [newCash] = await db.insert(cash).values({
        openingAmount,
        createdByUserId: userId,
        updatedByUserId: userId
    }).returning()

    return newCash
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
    type: "sale" | "drop" | "topup" | "open" | "refund"
    amount: number
    description?: string
    referenceType?: "sale" | "purchase" | "refund"
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

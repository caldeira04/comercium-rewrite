import { getTenantDb } from "@/db/db";
import { product, stockMovement } from "@/db/schema/tenant";
import { and, asc, eq, isNull, lt, sql } from "drizzle-orm";
import { resolveDateRangeFilter } from "../../../utils/dates";
import { AppError } from "../../../utils/errors";

export async function createStockMovement(tenantSlug: string, data: {
    productId: number
    type: "in" | "out" | "adjustment" | "transfer"
    quantity: number
    reason?: string
    referenceType?: "sale" | "purchase" | "refund" | "manual"
    referenceId?: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { productId, type, quantity, reason, referenceType, referenceId, userId } = data

    const [newStockMovement] = await db.insert(stockMovement).values({
        productId,
        type,
        quantity,
        reason,
        referenceType,
        referenceId,
        createdByUserId: userId,
        updatedByUserId: userId
    }).returning()

    return newStockMovement
}

export async function createBulkStockMovements(tenantSlug: string, data: {
    productId: number
    type: "in" | "out" | "adjustment" | "transfer"
    quantity: number
    reason?: string
    referenceType?: "sale" | "purchase" | "refund" | "manual"
    referenceId?: string
    userId: string
}[]) {
    const db = getTenantDb(tenantSlug)

    const [newStockMovements] = await db.insert(stockMovement).values(data.map((m) => ({
        productId: m.productId,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        createdByUserId: m.userId,
        updatedByUserId: m.userId
    }))).returning()

    return newStockMovements
}

export async function getStockMovements(tenantSlug: string, products: string[], includeDeleted?: boolean) {

    const db = getTenantDb(tenantSlug)
    const conditions = []

    if (!includeDeleted) {
        conditions.push(isNull(product.deletedAt))
    }

    const stockMovements = await db.query.stockMovement.findMany({
        columns: {
            id: true,
            quantity: true,
            type: true,
            reason: true,
            referenceType: true,
            referenceId: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            createdByUserId: true,
            updatedByUserId: true,
            deletedByUserId: true,
        },
        with: products.length > 0
            ? {
                product: {
                    columns: {
                        id: true,
                        name: true
                    }
                }
            } : undefined,

        where: includeDeleted
            ? undefined
            : (product, { and, isNull }) =>
                and(
                    isNull(product.deletedAt)
                ),

        orderBy: [asc(stockMovement.createdAt)],

    })

    return stockMovements
}

export async function deleteStockMovements(tenantSlug: string, stockMovementId: string, userId: string) {
    const db = getTenantDb(tenantSlug)

    const deleted = await db.update(stockMovement).set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedByUserId: userId
    })
        .where(eq(stockMovement.id, stockMovementId))
        .returning({ deleted_at: stockMovement.deletedAt })

    if (!deleted) return { ok: false }
    return { ok: true }
}

export type StockReportFilters = {
    startDate?: string
    endDate?: string
    /** Usa a janela do caixa (abertura até fechamento) no lugar do período. */
    cashId?: string
    timeZone?: string | null
}

type StockMovementType = (typeof stockMovement.type.enumValues)[number]

// Aplica um movimento ao saldo. O ajuste define o saldo absoluto, por isso os
// movimentos precisam ser aplicados em ordem cronológica.
export function applyStockMovement(balance: number, type: StockMovementType, quantity: number) {
    if (type === "in") return balance + quantity
    if (type === "out") return balance - quantity
    if (type === "adjustment") return quantity
    return balance
}

// Posição de estoque por produto em um período: saldo inicial, entradas,
// saídas, ajustes e saldo final. Movimentos excluídos são ignorados.
export async function getStockReport(tenantSlug: string, filters: StockReportFilters) {
    const db = getTenantDb(tenantSlug)

    let window: { startUtc: string, endExclusiveUtc: string | null }
    let cashInfo: { id: string, number: number, openedAt: string, closedAt: string | null } | null = null

    if (filters.cashId) {
        const selectedCash = await db.query.cash.findFirst({
            where: (entry, { eq }) => eq(entry.id, filters.cashId!),
            columns: { id: true, number: true, createdAt: true, closedAt: true },
        })

        if (!selectedCash) throw new AppError("caixa não encontrado", 404, "CASH_NOT_FOUND")

        cashInfo = {
            id: selectedCash.id,
            number: selectedCash.number,
            openedAt: selectedCash.createdAt,
            closedAt: selectedCash.closedAt,
        }
        // O fechamento entra na janela: o limite exclusivo é o segundo seguinte
        window = {
            startUtc: selectedCash.createdAt,
            endExclusiveUtc: selectedCash.closedAt ? addOneSecond(selectedCash.closedAt) : null,
        }
    } else {
        const range = resolveDateRangeFilter(filters, filters.timeZone)

        if (!range) throw new AppError("informe a data inicial e a data final", 400, "INVALID_DATE_RANGE")

        window = range
    }

    const products = await db.query.product.findMany({
        columns: { id: true, name: true, buyPrice: true, sellPrice: true },
        with: { category: { columns: { id: true, name: true } } },
        where: (entry, { isNull }) => isNull(entry.deletedAt),
        orderBy: [asc(product.name)],
    })

    const movements = await db
        .select({
            productId: stockMovement.productId,
            type: stockMovement.type,
            quantity: stockMovement.quantity,
            createdAt: stockMovement.createdAt,
        })
        .from(stockMovement)
        .where(and(
            isNull(stockMovement.deletedAt),
            window.endExclusiveUtc ? lt(stockMovement.createdAt, window.endExclusiveUtc) : undefined,
        ))
        .orderBy(asc(stockMovement.productId), asc(stockMovement.createdAt), sql`${stockMovement}.rowid`)

    const totals = new Map<number, { opening: number, inflow: number, outflow: number, adjustments: number, closing: number }>()

    for (const movement of movements) {
        const current = totals.get(movement.productId)
            ?? { opening: 0, inflow: 0, outflow: 0, adjustments: 0, closing: 0 }

        if (movement.createdAt < window.startUtc) {
            current.opening = applyStockMovement(current.opening, movement.type, movement.quantity)
            current.closing = current.opening
        } else {
            current.closing = applyStockMovement(current.closing, movement.type, movement.quantity)
            if (movement.type === "in") current.inflow += movement.quantity
            if (movement.type === "out") current.outflow += movement.quantity
            if (movement.type === "adjustment") current.adjustments += 1
        }

        totals.set(movement.productId, current)
    }

    return {
        cash: cashInfo,
        products: products.map((entry) => {
            const total = totals.get(entry.id)
                ?? { opening: 0, inflow: 0, outflow: 0, adjustments: 0, closing: 0 }

            return {
                id: entry.id,
                name: entry.name,
                buyPrice: entry.buyPrice,
                sellPrice: entry.sellPrice,
                category: entry.category,
                opening: total.opening,
                inflow: total.inflow,
                outflow: total.outflow,
                adjustments: total.adjustments,
                // Diferença líquida causada pelos ajustes no período
                adjustmentDelta: total.closing - total.opening - total.inflow + total.outflow,
                closing: total.closing,
            }
        }),
    }
}

function addOneSecond(sqliteUtc: string) {
    const date = new Date(`${sqliteUtc.replace(" ", "T")}Z`)

    return new Date(date.getTime() + 1000).toISOString().slice(0, 19).replace("T", " ")
}

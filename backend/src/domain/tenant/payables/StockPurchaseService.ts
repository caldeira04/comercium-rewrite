import { getTenantDb } from "@/db/db"
import { payable, payee, product, stockMovement } from "@/db/schema/tenant"
import { eq, sql } from "drizzle-orm"
import { AppError } from "../../../utils/errors"
import { isValidDateInput, todayInTimeZone } from "../../../utils/dates"
import {
    preparePayableRows,
    type InstallmentMode,
    type PaymentMethod,
} from "./PayablesService"

export type CreateStockPurchaseInput = {
    productId: number
    quantity: number
    reason?: string
    payeeId?: string | null
    categoryId?: string | null
    bankAccountId?: string | null
    amount?: number
    dueDate?: string
    paymentMethod?: PaymentMethod | null
    notes?: string | null
    installments?: { count?: number, mode?: InstallmentMode }
    createPayable: boolean
    userId: string
    timeZone?: string | null
}

export async function createStockPurchase(tenantSlug: string, data: CreateStockPurchaseInput) {
    const db = getTenantDb(tenantSlug)

    if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
        throw new AppError("informe uma quantidade válida", 400, "INVALID_QUANTITY")
    }

    const selectedProduct = await db.query.product.findFirst({
        where: (product, { and, eq, isNull }) => and(eq(product.id, data.productId), isNull(product.deletedAt)),
        columns: { id: true, name: true, buyPrice: true },
    })

    if (!selectedProduct) {
        throw new AppError("produto não encontrado", 404, "PRODUCT_NOT_FOUND")
    }

    const stockMovementId = crypto.randomUUID()
    let payableRows: (typeof payable.$inferInsert)[] = []

    if (data.createPayable) {
        const amount = data.amount ?? selectedProduct.buyPrice * data.quantity

        const { rows } = await preparePayableRows(db, {
            description: `compra de ${data.quantity}x ${selectedProduct.name}`,
            amount,
            dueDate: data.dueDate ?? todayInTimeZone(data.timeZone),
            paymentMethod: data.paymentMethod,
            payeeId: data.payeeId,
            categoryId: data.categoryId,
            bankAccountId: data.bankAccountId,
            notes: data.notes,
            installments: data.installments,
            origin: "stock_purchase",
            stockMovementId,
            userId: data.userId,
        })

        payableRows = rows
    } else if (data.dueDate && !isValidDateInput(data.dueDate)) {
        throw new AppError("informe uma data de vencimento válida", 400, "INVALID_DATE")
    }

    return await db.transaction(async (tx) => {
        const [movement] = await tx.insert(stockMovement).values({
            id: stockMovementId,
            productId: data.productId,
            type: "in",
            quantity: data.quantity,
            reason: data.reason ?? "compra",
            referenceType: "purchase",
            createdByUserId: data.userId,
            updatedByUserId: data.userId,
        }).returning()

        const payables = payableRows.length > 0
            ? await tx.insert(payable).values(payableRows).returning()
            : []

        return {
            movement,
            payables,
            groupId: payables[0]?.groupId ?? null,
        }
    })
}

export type StockPurchaseBatchInput = {
    // Favorecido existente ou um novo, criado na mesma transação
    payeeId?: string | null
    newPayee?: { name: string, document?: string | null } | null
    items: {
        productId?: number | null
        newProduct?: { name: string, gtin?: string | null, sellPrice: number } | null
        quantity: number
        unitCost: number
    }[]
    updateCosts: boolean
    reason: string
    payables: { description: string, amount: number, dueDate: string }[]
    paymentMethod?: PaymentMethod | null
    categoryId?: string | null
    notes?: string | null
    userId: string
}

// Entrada de vários itens de uma compra (ex.: NF-e), com produtos e
// favorecido novos e as contas a pagar, tudo numa transação
export async function createStockPurchaseBatch(tenantSlug: string, data: StockPurchaseBatchInput) {
    const db = getTenantDb(tenantSlug)

    for (const item of data.items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            throw new AppError("informe uma quantidade válida", 400, "INVALID_QUANTITY")
        }
        if (!item.productId && !item.newProduct?.name.trim()) {
            throw new AppError("informe o produto", 400, "PRODUCT_NOT_FOUND")
        }
    }

    // Valida as contas antes; o favorecido novo só existe dentro da transação
    const payableRows: (typeof payable.$inferInsert)[] = []
    for (const entry of data.payables) {
        const { rows } = await preparePayableRows(db, {
            description: entry.description,
            amount: entry.amount,
            dueDate: entry.dueDate,
            paymentMethod: data.paymentMethod,
            payeeId: data.newPayee ? null : data.payeeId,
            categoryId: data.categoryId,
            notes: data.notes,
            userId: data.userId,
        })
        payableRows.push(...rows)
    }

    return await db.transaction(async (tx) => {
        let payeeId = data.payeeId ?? null
        if (data.newPayee) {
            const [created] = await tx.insert(payee).values({
                name: data.newPayee.name.trim(),
                document: data.newPayee.document ?? null,
                createdByUserId: data.userId,
                updatedByUserId: data.userId,
            }).returning()
            payeeId = created.id
        }

        const movements = []
        for (const item of data.items) {
            let productId = item.productId ?? null
            if (!productId) {
                const [created] = await tx.insert(product).values({
                    name: item.newProduct!.name.trim(),
                    gtin: item.newProduct!.gtin ?? null,
                    sellPrice: item.newProduct!.sellPrice,
                    buyPrice: item.unitCost,
                    createdByUserId: data.userId,
                    updatedByUserId: data.userId,
                }).returning()
                productId = created.id
            } else if (data.updateCosts) {
                await tx.update(product).set({
                    buyPrice: item.unitCost,
                    updatedAt: sql`(CURRENT_TIMESTAMP)`,
                    updatedByUserId: data.userId,
                }).where(eq(product.id, productId))
            }

            const [movement] = await tx.insert(stockMovement).values({
                productId,
                type: "in",
                quantity: item.quantity,
                reason: data.reason,
                referenceType: "purchase",
                createdByUserId: data.userId,
                updatedByUserId: data.userId,
            }).returning()
            movements.push(movement)
        }

        const payables = payableRows.length > 0
            ? await tx.insert(payable).values(payableRows.map((row) => ({ ...row, payeeId }))).returning()
            : []

        return { movements, payables, payeeId }
    })
}

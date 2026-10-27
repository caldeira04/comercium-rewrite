import { getTenantDb } from "@/db/db"
import { payable, stockMovement } from "@/db/schema/tenant"
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

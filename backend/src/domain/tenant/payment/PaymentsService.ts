import { getTenantDb } from "@/db/db";
import { settleSale } from "../sales/SalesService";
import { payment, sale } from "@/db/schema/tenant";
import { desc, eq, sql } from "drizzle-orm";
import { createCashMovement } from "../cash/CashService";
import { AppError } from "../../../utils/errors";

export function createPayment(tenantSlug: string, data: {
    userId: string
    totalAmount: number
    paidAmount: number
    saleId: string
    paymentMethod: "cash" | "pix" | "debit" | "credit" | "voucher"
}) {
    const { userId, totalAmount, paidAmount, paymentMethod, saleId } = data

    const db = getTenantDb(tenantSlug)
    const transaction = db.transaction(async (tx) => {

        const selectedSale = await tx.query.sale.findFirst({
            orderBy: [desc(sale.createdAt)],
            where: (sale, { and, eq, isNull }) =>
                and(
                    isNull(sale.settledAt),
                    eq(sale.id, saleId)
                ),
            columns: {
                id: true,
                cashId: true
            }
        })

        if (!selectedSale) throw new AppError("não foi possível encontrar venda", 404, "SALE_NOT_FOUND")

        const cashId = paidAmount >= totalAmount
            ? await settleSale(tenantSlug, { userId, saleId })
            : selectedSale.cashId

        if (!cashId) throw new AppError("o caixa precisa estar aberto para registrar um pagamento", 409, "CASH_NOT_OPEN")

        const [newPayment] = await tx.insert(payment).values({
            amount: paidAmount,
            paymentMethod,
            saleId: selectedSale.id,
            paidAt: sql`(CURRENT_TIMESTAMP)`
        }).returning()

        await createCashMovement(tenantSlug, {
            cashId,
            amount: paidAmount,
            nature: "in",
            type: "payment",
            userId,
            description: "venda realizada",
            referenceType: "payment",
            referenceId: newPayment.id
        })

        return newPayment
    })

    return transaction
}

export async function refundPayment(tenantSlug: string, data: {
    paymentId: string
    userId: string
}) {
    const db = getTenantDb(tenantSlug)
    const { paymentId, userId } = data

    const transaction = await db.transaction(async (tx) => {
        const selectedPayment = await tx.query.payment.findFirst({
            where: (payment, { eq }) => eq(payment.id, paymentId),
            columns: {
                id: true,
                amount: true,
                status: true,
                saleId: true,
            },
        })

        if (!selectedPayment) {
            throw new AppError("pagamento não encontrado", 404, "PAYMENT_NOT_FOUND")
        }

        if (selectedPayment.status !== "paid") {
            throw new AppError("apenas pagamentos pagos podem ser estornados", 409, "PAYMENT_NOT_PAID")
        }

        const selectedSale = await tx.query.sale.findFirst({
            where: (sale, { eq }) => eq(sale.id, selectedPayment.saleId),
            columns: {
                id: true,
                cashId: true,
            },
        })

        if (!selectedSale) {
            throw new AppError("venda do pagamento não encontrada", 404, "SALE_NOT_FOUND")
        }

        if (!selectedSale.cashId) {
            throw new AppError("venda sem caixa vinculado", 409, "SALE_WITHOUT_CASH")
        }

        await tx.update(payment).set({
            status: "refunded",
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedByUserId: userId,
        })
            .where(eq(payment.id, selectedPayment.id))

        await createCashMovement(tenantSlug, {
            cashId: selectedSale.cashId,
            amount: selectedPayment.amount,
            nature: "out",
            type: "refund",
            userId,
            description: "estorno de pagamento",
            referenceType: "refund",
            referenceId: selectedPayment.id,
        })

        return selectedPayment
    })

    return transaction
}

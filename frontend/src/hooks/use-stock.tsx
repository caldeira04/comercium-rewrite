import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import { throwApiError } from "@/lib/api-error"

type PaymentMethod = "cash" | "pix" | "debit" | "credit" | "voucher"
type InstallmentMode = "recurring" | "installment"

export type CreatePurchasePayload = {
    productId: number
    quantity: number
    reason?: string
    createPayable: boolean
    payeeId?: string | null
    categoryId?: string | null
    bankAccountId?: string | null
    amount?: number
    dueDate?: string
    paymentMethod?: PaymentMethod | null
    notes?: string | null
    installments?: { count?: number, mode?: InstallmentMode }
}

export type StockReportFilters = {
    startDate?: string
    endDate?: string
    /** Usa a janela do caixa no lugar do período. */
    cashId?: string
}

// Posição de estoque por produto no período (saldo inicial, entradas, saídas e final).
export function useStockReport(filters: StockReportFilters, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: ["stockReport", filters],
        queryFn: async () => {
            const { data, error } = await api.tenant.stock.report.get({
                query: filters.cashId ? { cashId: filters.cashId } : { startDate: filters.startDate, endDate: filters.endDate },
            })
            if (error) throwApiError(error)
            return data
        },
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    })
}

export function useStock() {
    const stockMovementsQuery = useQuery({
        queryKey: ["stockMovements"],
        queryFn: async () => {
            const { data, error } = await api.tenant.stock.movements.get()
            if (error) throwApiError(error)
            return data
        },
    })

    const createStockMovementMutation = useMutation({
        mutationFn: async ({ productId, type, quantity, reason }: {
            productId: number
            type: "in" | "out" | "adjustment" | "transfer"
            quantity: number
            reason?: string
        }) => {
            const { data, error } = await api.tenant.stock.movements.post({
                productId,
                type,
                quantity,
                reason,
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stockMovements"] })
            queryClient.invalidateQueries({ queryKey: ["products"] })
        },
    })

    const createPurchaseMutation = useMutation({
        mutationFn: async (payload: CreatePurchasePayload) => {
            const { data, error } = await api.tenant.stock.purchases.post(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stockMovements"] })
            queryClient.invalidateQueries({ queryKey: ["products"] })
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })

    return {
        stockMovements: stockMovementsQuery.data,
        stockMovementsIsPending: stockMovementsQuery.isPending,
        stockMovementsIsError: stockMovementsQuery.isError,
        createStockMovement: createStockMovementMutation.mutateAsync,
        createStockMovementIsPending: createStockMovementMutation.isPending,
        createPurchase: createPurchaseMutation.mutateAsync,
        createPurchaseIsPending: createPurchaseMutation.isPending,
    }
}

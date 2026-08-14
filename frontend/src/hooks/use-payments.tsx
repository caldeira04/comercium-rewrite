import { api } from "@/lib/api"
import { useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export function usePayments() {

    const createPaymentsMutation = useMutation({
        mutationFn: async ({ saleId, paidAmount, paymentMethod, totalAmount }: {
            saleId: string,
            paidAmount: number,
            paymentMethod: "cash" | "credit" | "pix" | "debit" | "voucher",
            totalAmount: number
        }) => {
            const { data, error } = await api.tenant.payments({ saleId }).post({
                paidAmount,
                paymentMethod,
                totalAmount
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] })
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
        }
    })
    const refundPaymentMutation = useMutation({
        mutationFn: async (paymentId: string) => {
            const { data, error } = await api.tenant.payments.refund.post({
                paymentId
            }, {
                fetch: { credentials: "include" }
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sales"] })
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["currentCash"] })
            queryClient.invalidateQueries({ queryKey: ["cash"] })
        }
    })

    return {
        createPayments: createPaymentsMutation.mutateAsync,
        createPaymentsIsPending: createPaymentsMutation.isPending,
        createPaymentsIsError: createPaymentsMutation.isError,
        refundPayment: refundPaymentMutation.mutateAsync,
        refundPaymentIsPending: refundPaymentMutation.isPending,
        refundPaymentIsError: refundPaymentMutation.isError,
    }
}

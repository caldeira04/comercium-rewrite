import { api } from "@/lib/api"
import { useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

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
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] })
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
        }
    })
    return {
        createPayments: createPaymentsMutation.mutateAsync,
        createPaymentsIsPending: createPaymentsMutation.isPending,
        createPaymentsIsError: createPaymentsMutation.isError,
    }
}

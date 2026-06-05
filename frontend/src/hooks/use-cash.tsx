import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export function useCash() {

    const currentCashQuery = useQuery({
        queryKey: ["currentCash"],
        queryFn: async () => {
            const { data, error } = await api.tenant.cash.current.get()
            if (error) throwApiError(error)
            return data
        }
    })

    const cashesQuery = useQuery({
        queryKey: ["cash"],
        queryFn: async () => {
            const { data, error } = await api.tenant.cash.get()
            if (error) throwApiError(error)
            return data
        }
    })

    const createCashMutation = useMutation({
        mutationFn: async ({ openingAmount }: {
            openingAmount: number
        }) => {
            const { data, error } = await api.tenant.cash.post({
                openingAmount
            }, {
                fetch: {
                    credentials: "include"
                }
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentCash"] })
            queryClient.invalidateQueries({ queryKey: ["cash"] })
        }
    })

    const closeCashMutation = useMutation({
        mutationFn: async ({ cashId, actualClosingAmount }: {
            cashId: string
            actualClosingAmount: number
        }) => {
            const { data, error } = await api.tenant.cash({ cashId }).close.patch({
                actualClosingAmount
            }, {
                fetch: {
                    credentials: "include"
                }
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentCash"] })
            queryClient.invalidateQueries({ queryKey: ["cash"] })
        }
    })

    return {
        currentCash: currentCashQuery.data,
        currentCashIsPending: currentCashQuery.isPending,
        currentCashIsError: currentCashQuery.isError,
        cashes: cashesQuery.data,
        cashesIsPending: cashesQuery.isPending,
        cashesIsError: cashesQuery.isError,
        createCash: createCashMutation.mutateAsync,
        createCashIsPending: createCashMutation.isPending,
        createCashIsError: createCashMutation.isError,
        closeCash: closeCashMutation.mutateAsync,
        closeCashIsPending: closeCashMutation.isPending,
        closeCashIsError: closeCashMutation.isError
    }
}

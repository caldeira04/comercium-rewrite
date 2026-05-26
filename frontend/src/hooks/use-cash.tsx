import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

export function useCash() {

    const currentCashQuery = useQuery({
        queryKey: ["currentCash"],
        queryFn: async () => {
            const { data, error } = await api.tenant.cash.current.get()
            if (error) throw error
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
            if (error) throw error
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
        createCash: createCashMutation.mutateAsync,
        createCashIsPending: createCashMutation.isPending,
        createCashIsError: createCashMutation.isError
    }
}

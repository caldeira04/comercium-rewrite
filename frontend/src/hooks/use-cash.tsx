import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

export function useCash(cashId?: number) {

    // const singleCashQuery = useQuery({
    //     queryKey: ["singlecash", cashId],
    //     enabled: !!cashId,
    //     queryFn: async ({ queryKey }) => {
    //         const [, cashId] = queryKey
    //         const { data, error } = await api.tenant.cash({ cashId: Number(cashId) }).get({
    //             fetch: {
    //                 credentials: "include"
    //             }
    //         })
    //         if (error) throw error
    //         return data
    //     }
    // })

    // const cashQuery = useQuery({
    //     queryKey: ["cashs"],
    //     queryFn: async () => {
    //         const { data, error } = await api.tenant.cash.get()
    //         if (error) throw error
    //         return data
    //     }
    // })
    //
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
            queryClient.invalidateQueries({ queryKey: ["cashs"] })
        }
    })

    return {
        // cashs: cashQuery.data,
        // cashIsPending: cashQuery.isPending,
        // cashIsError: cashQuery.isError,
        // singleCash: singleCashQuery.data,
        // singleCashIsPending: singleCashQuery.isPending,
        // singleCashIsError: singleCashQuery.isError,
        currentCash: currentCashQuery.data,
        currentCashIsPending: currentCashQuery.isPending,
        currentCashIsError: currentCashQuery.isError,
        createCash: createCashMutation.mutateAsync,
        createCashIsPending: createCashMutation.isPending,
        createCashIsError: createCashMutation.isError
    }
}

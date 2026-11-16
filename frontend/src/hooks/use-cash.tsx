import { api } from "@/lib/api"
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export type CashListFilters = {
    startDate?: string
    endDate?: string
    /** "all", "open" ou "closed" */
    status?: string
}

// Lista de caixas filtrada no backend; o período considera a data de abertura
// no fuso do tenant.
export function useCashList(filters: CashListFilters = {}, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: ["cash", filters],
        queryFn: async () => {
            const query = Object.fromEntries(
                Object.entries(filters).filter(([, value]) => value !== undefined && value !== "all"),
            ) as Record<string, string>
            const { data, error } = await api.tenant.cash.get({ query })
            if (error) throwApiError(error)
            return data
        },
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    })
}

export function useCash({ loadCashes = false }: {
    /** Carrega o histórico completo de caixas, sem filtros. */
    loadCashes?: boolean
} = {}) {

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
            const { data, error } = await api.tenant.cash.get({ query: {} })
            if (error) throwApiError(error)
            return data
        },
        enabled: loadCashes,
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

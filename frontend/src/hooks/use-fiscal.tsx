import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export function useSaleNfce(saleId?: string) {
    const documentQuery = useQuery({
        queryKey: ["fiscal", "nfce", saleId],
        queryFn: async () => {
            if (!saleId) return { document: null }
            const { data, error } = await api.tenant.fiscal.nfce({ saleId }).get()
            if (error) throwApiError(error)
            return data
        },
        enabled: !!saleId,
    })

    const emitMutation = useMutation({
        mutationFn: async (targetSaleId: string) => {
            const { data, error } = await api.tenant.fiscal.nfce({ saleId: targetSaleId }).emit.post()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: (_data, targetSaleId) => {
            queryClient.invalidateQueries({ queryKey: ["fiscal", "nfce", targetSaleId] })
            queryClient.invalidateQueries({ queryKey: ["admin", "fiscal"] })
        },
    })

    const refreshMutation = useMutation({
        mutationFn: async (targetSaleId: string) => {
            const { data, error } = await api.tenant.fiscal.nfce({ saleId: targetSaleId }).refresh.post()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: (_data, targetSaleId) => {
            queryClient.invalidateQueries({ queryKey: ["fiscal", "nfce", targetSaleId] })
            queryClient.invalidateQueries({ queryKey: ["admin", "fiscal"] })
        },
    })

    const cancelMutation = useMutation({
        mutationFn: async ({ targetSaleId, justificativa }: { targetSaleId: string, justificativa: string }) => {
            const { data, error } = await api.tenant.fiscal.nfce({ saleId: targetSaleId }).delete({ justificativa })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ["fiscal", "nfce", vars.targetSaleId] })
            queryClient.invalidateQueries({ queryKey: ["admin", "fiscal"] })
        },
    })

    return {
        nfce: documentQuery.data?.document ?? null,
        nfceIsPending: documentQuery.isPending,
        emitNfce: emitMutation.mutateAsync,
        emitNfceIsPending: emitMutation.isPending,
        refreshNfce: refreshMutation.mutateAsync,
        refreshNfceIsPending: refreshMutation.isPending,
        cancelNfce: cancelMutation.mutateAsync,
        cancelNfceIsPending: cancelMutation.isPending,
    }
}

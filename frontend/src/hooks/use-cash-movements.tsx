import { api } from "@/lib/api"
import { useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

export function useCashMovements() {

    const createMovementMutation = useMutation({
        mutationFn: async ({ amount, description, cashId, type }: {
            amount: number
            description: string
            cashId: string
            type: "topup" | "drop"
        }) => {
            const { data, error } = await api.tenant.cash.movement({ cashId }).post({
                amount, description, type
            }, {
                fetch: { credentials: "include" }
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
        createMovement: createMovementMutation.mutateAsync,
        createMovementIsPending: createMovementMutation.isPending,
        createMovementIsError: createMovementMutation.isError,
    }
}

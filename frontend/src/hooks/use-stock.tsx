import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { useMutation, useQuery } from "@tanstack/react-query"

export function useStock() {
    const stockMovementsQuery = useQuery({
        queryKey: ["stockMovements"],
        queryFn: async () => {
            const { data, error } = await api.tenant.stock.movements.get()
            if (error) throw error
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
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stockMovements"] })
            queryClient.invalidateQueries({ queryKey: ["products"] })
        },
    })

    return {
        stockMovements: stockMovementsQuery.data,
        stockMovementsIsPending: stockMovementsQuery.isPending,
        stockMovementsIsError: stockMovementsQuery.isError,
        createStockMovement: createStockMovementMutation.mutateAsync,
        createStockMovementIsPending: createStockMovementMutation.isPending,
    }
}

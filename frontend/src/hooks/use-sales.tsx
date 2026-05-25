import { api } from "@/lib/api"
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query"

export function useSales() {
    const queryClient = new QueryClient()

    const currentSaleQuery = useQuery({
        queryKey: ["currentSale", "sales"],
        queryFn: async () => {
            const { data, error } = await api.tenant.sales.current.get()
            if (error) throw error
            return data
        }
    })

    const salesQuery = useQuery({
        queryKey: ["sales"],
        queryFn: async () => {
            const { data, error } = await api.tenant.sales.get()
            if (error) throw error
            return data
        }
    })

    const createSaleMutation = useMutation({
        mutationFn: async (clientId: number) => {
            const { data, error } = await api.tenant.sales.new.post({
                clientId
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] }),
                queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    return {
        sales: salesQuery.data,
        salesIsPending: salesQuery.isPending,
        salesIsError: salesQuery.isError,
        currentSale: currentSaleQuery.data,
        currentSaleIsPending: currentSaleQuery.isPending,
        currentSaleIsError: currentSaleQuery.isError,
        createSale: createSaleMutation.mutateAsync,
        createSaleIsPending: createSaleMutation.isPending,
        createSaleIsError: createSaleMutation.isError
    }
}

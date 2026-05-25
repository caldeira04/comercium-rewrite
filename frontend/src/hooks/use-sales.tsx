import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"

export function useSales() {

    const currentSaleQuery = useQuery({
        queryKey: ["currentSale"],
        queryFn: async () => {
            const { data, error } = await api.tenant.sales.get()
            if (error) throw error
            return data
        }
    })

    return {
        currentSale: currentSaleQuery.data,
        currentSaleIsLoading: currentSaleQuery.isLoading,
        currentSaleIsError: currentSaleQuery.isError
    }
}

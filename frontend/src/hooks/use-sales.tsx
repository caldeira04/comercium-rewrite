import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

export function useSales() {

    const currentSaleQuery = useQuery({
        queryKey: ["currentSale"],
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

    const addProductToSaleMutation = useMutation({
        mutationFn: async ({ productId, quantity }: {
            productId: number,
            quantity: number
        }) => {
            const { data, error } = await api.tenant.sales.item({
                productId
            }).post({
                quantity
            }, {
                fetch: {
                    credentials: "include"
                }
            })

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
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
        createSaleIsError: createSaleMutation.isError,
        addProductToSale: addProductToSaleMutation.mutateAsync,
        addProductToSaleIsPending: addProductToSaleMutation.isPending,
        addProductToSaleIsError: addProductToSaleMutation.isError,
    }
}

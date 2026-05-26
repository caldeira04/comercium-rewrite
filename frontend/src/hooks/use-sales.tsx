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
        mutationFn: async () => {
            const { data, error } = await api.tenant.sales.new.post()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    const settleSaleMutation = useMutation({
        mutationFn: async (saleId: string) => {
            const { data, error } = await api.tenant.sales.settle({ saleId }).post({
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

    const updateSaleClientMutation = useMutation({
        mutationFn: async ({ saleId, clientId }: {
            saleId: string,
            clientId: number
        }) => {
            const { data, error } = await api.tenant.sales({ id: saleId }).client.patch({
                clientId
            }, {
                fetch: { credentials: "include" }
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    const addProductToSaleMutation = useMutation({
        mutationFn: async ({ productId, quantity, discount }: {
            productId: number,
            quantity: number,
            discount: number
        }) => {
            const { data, error } = await api.tenant.sales.item({
                productId
            }).post({
                quantity,
                discount
            }, {
                fetch: { credentials: "include" }
            })

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    const updateSaleItemMutation = useMutation({
        mutationFn: async ({ saleItemId, quantity, discount }: {
            saleItemId: string,
            quantity: number,
            discount: number
        }) => {
            const { data, error } = await api.tenant.sales["sale-item"]({ saleItemId }).patch({
                quantity,
                discount
            }, {
                fetch: { credentials: "include" }
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
        settleSale: settleSaleMutation.mutateAsync,
        settleSaleIsPending: settleSaleMutation.isPending,
        settleSaleIsError: settleSaleMutation.isError,
        addProductToSale: addProductToSaleMutation.mutateAsync,
        addProductToSaleIsPending: addProductToSaleMutation.isPending,
        addProductToSaleIsError: addProductToSaleMutation.isError,
        updateSaleItem: updateSaleItemMutation.mutateAsync,
        updateSaleItemIsPending: updateSaleItemMutation.isPending,
        updateSaleItemIsError: updateSaleItemMutation.isError,
        updateSaleClient: updateSaleClientMutation.mutateAsync,
        updateSaleClientIsPending: updateSaleClientMutation.isPending,
        updateSaleClientIsError: updateSaleClientMutation.isError,
    }
}

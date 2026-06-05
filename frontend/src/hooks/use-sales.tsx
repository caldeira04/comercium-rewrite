import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export function useSales({ includeDeleted = false }: {
    includeDeleted?: boolean
} = {}) {

    const currentSaleQuery = useQuery({
        queryKey: ["currentSale", { includeDeleted }],
        queryFn: async () => {
            const { data, error } = await api.tenant.sales.current.get({
                query: includeDeleted ? { includeDeleted: "true" } : undefined
            })
            if (error) throwApiError(error)
            return data
        }
    })

    const salesQuery = useQuery({
        queryKey: ["sales"],
        queryFn: async () => {
            const { data, error } = await api.tenant.sales.get()
            if (error) throwApiError(error)
            return data
        }
    })

    const createSaleMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await api.tenant.sales.new.post()
            if (error) throwApiError(error)
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
            if (error) throwApiError(error)
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
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    const addProductToSaleMutation = useMutation({
        mutationFn: async ({ productId, quantity, discount, unitPrice }: {
            productId: number,
            quantity: number,
            discount: number
            unitPrice?: number
        }) => {
            const { data, error } = await api.tenant.sales.item({
                productId
            }).post({
                quantity,
                discount,
                unitPrice
            }, {
                fetch: { credentials: "include" }
            })

            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    const updateSaleItemMutation = useMutation({
        mutationFn: async ({ saleItemId, quantity, discount, unitPrice }: {
            saleItemId: string,
            quantity: number,
            discount: number
            unitPrice?: number
        }) => {
            const { data, error } = await api.tenant.sales["sale-item"]({ saleItemId }).patch({
                quantity,
                discount,
                unitPrice
            }, {
                fetch: { credentials: "include" }
            })

            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    const removeProductFromSaleMutation = useMutation({
        mutationFn: async ({ saleItemId, deleteReason }: {
            saleItemId: string
            deleteReason?: string
        }) => {
            const { data, error } = await api.tenant.sales["sale-item"]({ saleItemId }).delete({
                deleteReason
            }, {
                fetch: { credentials: "include" }
            })

            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["currentSale"] })
            queryClient.invalidateQueries({ queryKey: ["sales"] })
        }
    })

    const reactivateProductFromSaleMutation = useMutation({
        mutationFn: async (saleItemId: string) => {
            const { data, error } = await api.tenant.sales["sale-item"]({ saleItemId }).reactivate.patch(undefined, {
                fetch: { credentials: "include" }
            })

            if (error) throwApiError(error)
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
        removeProductFromSale: removeProductFromSaleMutation.mutateAsync,
        removeProductFromSaleIsPending: removeProductFromSaleMutation.isPending,
        removeProductFromSaleIsError: removeProductFromSaleMutation.isError,
        reactivateProductFromSale: reactivateProductFromSaleMutation.mutateAsync,
        reactivateProductFromSaleIsPending: reactivateProductFromSaleMutation.isPending,
        reactivateProductFromSaleIsError: reactivateProductFromSaleMutation.isError,
        updateSaleClient: updateSaleClientMutation.mutateAsync,
        updateSaleClientIsPending: updateSaleClientMutation.isPending,
        updateSaleClientIsError: updateSaleClientMutation.isError,
    }
}

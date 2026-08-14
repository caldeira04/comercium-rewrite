import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export function useProducts(productId?: number) {

    const productsQuery = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const { data, error } = await api.tenant.products.get()
            if (error) throwApiError(error)
            return data
        }
    })

    const singleProduct = productsQuery.data?.find((product) => product.id === productId)

    const createProductMutation = useMutation({
        mutationFn: async ({ buyPrice, name, sellPrice, gtin, categoryId }: {
            buyPrice: number
            sellPrice: number
            name: string
            gtin: string
            categoryId?: number
        }) => {
            const { data, error } = await api.tenant.products.post({
                buyPrice,
                name,
                sellPrice,
                gtin,
                categoryId
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] })
        }
    })

    const updateProductMutation = useMutation({
        mutationFn: async ({ productId, buyPrice, name, sellPrice, gtin, categoryId }: {
            productId: number
            buyPrice: number
            sellPrice: number
            name: string
            gtin: string | null
            categoryId?: number | null
        }) => {
            const { data, error } = await api.tenant.products({ productId: String(productId) }).patch({
                buyPrice,
                name,
                sellPrice,
                gtin,
                categoryId
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] })
        }
    })

    return {
        products: productsQuery.data,
        productsIsPending: productsQuery.isPending,
        productsIsError: productsQuery.isError,
        singleProduct,
        singleProductIsPending: productsQuery.isPending,
        singleProductIsError: productsQuery.isError,
        createProduct: createProductMutation.mutateAsync,
        createProductIsPending: createProductMutation.isPending,
        createProductIsError: createProductMutation.isError,
        updateProduct: updateProductMutation.mutateAsync,
        updateProductIsPending: updateProductMutation.isPending,
        updateProductIsError: updateProductMutation.isError
    }
}

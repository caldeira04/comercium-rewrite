import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"

export function useProducts(productId?: number) {

    const productsQuery = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const { data, error } = await api.tenant.products.get()
            if (error) throw error
            return data
        }
    })

    const singleProduct = productsQuery.data?.find((product) => product.id === productId)

    const createProductMutation = useMutation({
        mutationFn: async ({ buyPrice, name, sellPrice, gtin }: {
            buyPrice: number
            sellPrice: number
            name: string
            gtin: string
        }) => {
            const { data, error } = await api.tenant.products.post({
                buyPrice,
                name,
                sellPrice,
                gtin
            })
            if (error) throw error
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
        createProductIsError: createProductMutation.isError
    }
}

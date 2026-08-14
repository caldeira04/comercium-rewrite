import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export function useCategories() {

    const categoriesQuery = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const { data, error } = await api.tenant.categories.get()
            if (error) throwApiError(error)
            return data
        }
    })

    const createCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await api.tenant.categories.post({ name })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] })
        }
    })

    return {
        categories: categoriesQuery.data,
        categoriesIsPending: categoriesQuery.isPending,
        categoriesIsError: categoriesQuery.isError,
        createCategory: createCategoryMutation.mutateAsync,
        createCategoryIsPending: createCategoryMutation.isPending,
        createCategoryIsError: createCategoryMutation.isError,
    }
}
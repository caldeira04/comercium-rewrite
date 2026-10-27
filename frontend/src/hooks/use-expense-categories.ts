import { api } from "@/lib/api"
import { throwApiError } from "@/lib/api-error"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export function useExpenseCategories() {
    const queryClient = useQueryClient()

    const expenseCategoriesQuery = useQuery({
        queryKey: ["expenseCategories"],
        queryFn: async () => {
            const { data, error } = await api.tenant["expense-categories"].get()
            if (error) throwApiError(error)
            return data
        },
    })

    const createExpenseCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await api.tenant["expense-categories"].post({ name })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenseCategories"] })
        },
    })

    const updateExpenseCategoryMutation = useMutation({
        mutationFn: async ({ categoryId, name }: { categoryId: string, name: string }) => {
            const { data, error } = await api.tenant["expense-categories"]({ categoryId }).patch({ name })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenseCategories"] })
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })

    const deleteExpenseCategoryMutation = useMutation({
        mutationFn: async (categoryId: string) => {
            const { data, error } = await api.tenant["expense-categories"]({ categoryId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenseCategories"] })
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })

    return {
        expenseCategories: expenseCategoriesQuery.data,
        expenseCategoriesIsPending: expenseCategoriesQuery.isPending,
        expenseCategoriesIsError: expenseCategoriesQuery.isError,
        createExpenseCategory: createExpenseCategoryMutation.mutateAsync,
        createExpenseCategoryIsPending: createExpenseCategoryMutation.isPending,
        updateExpenseCategory: updateExpenseCategoryMutation.mutateAsync,
        updateExpenseCategoryIsPending: updateExpenseCategoryMutation.isPending,
        deleteExpenseCategory: deleteExpenseCategoryMutation.mutateAsync,
        deleteExpenseCategoryIsPending: deleteExpenseCategoryMutation.isPending,
    }
}

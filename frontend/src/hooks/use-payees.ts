import { api } from "@/lib/api"
import { throwApiError } from "@/lib/api-error"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type PayeeKind = "supplier" | "employee" | "other"

export type PayeePayload = {
    name: string
    kind?: PayeeKind
    document?: string | null
    phone?: string | null
    email?: string | null
}

export function usePayees() {
    const queryClient = useQueryClient()

    const payeesQuery = useQuery({
        queryKey: ["payees"],
        queryFn: async () => {
            const { data, error } = await api.tenant.payees.get()
            if (error) throwApiError(error)
            return data
        },
    })

    const createPayeeMutation = useMutation({
        mutationFn: async (payload: PayeePayload) => {
            const { data, error } = await api.tenant.payees.post(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payees"] })
        },
    })

    const updatePayeeMutation = useMutation({
        mutationFn: async ({ payeeId, payload }: { payeeId: string, payload: PayeePayload }) => {
            const { data, error } = await api.tenant.payees({ payeeId }).patch(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payees"] })
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })

    const deletePayeeMutation = useMutation({
        mutationFn: async (payeeId: string) => {
            const { data, error } = await api.tenant.payees({ payeeId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payees"] })
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })

    return {
        payees: payeesQuery.data,
        payeesIsPending: payeesQuery.isPending,
        payeesIsError: payeesQuery.isError,
        createPayee: createPayeeMutation.mutateAsync,
        createPayeeIsPending: createPayeeMutation.isPending,
        updatePayee: updatePayeeMutation.mutateAsync,
        updatePayeeIsPending: updatePayeeMutation.isPending,
        deletePayee: deletePayeeMutation.mutateAsync,
        deletePayeeIsPending: deletePayeeMutation.isPending,
    }
}

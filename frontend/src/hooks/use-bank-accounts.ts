import { api } from "@/lib/api"
import { throwApiError } from "@/lib/api-error"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type BankAccountKind = "cash" | "checking" | "savings" | "other"

export type BankAccountPayload = {
    name: string
    kind?: BankAccountKind
    bankName?: string | null
    agency?: string | null
    accountNumber?: string | null
    isActive?: boolean
}

export function useBankAccounts() {
    const queryClient = useQueryClient()

    const bankAccountsQuery = useQuery({
        queryKey: ["bankAccounts"],
        queryFn: async () => {
            const { data, error } = await api.tenant["bank-accounts"].get()
            if (error) throwApiError(error)
            return data
        },
    })

    const createBankAccountMutation = useMutation({
        mutationFn: async (payload: BankAccountPayload) => {
            const { data, error } = await api.tenant["bank-accounts"].post(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bankAccounts"] })
        },
    })

    const updateBankAccountMutation = useMutation({
        mutationFn: async ({ bankAccountId, payload }: { bankAccountId: string, payload: BankAccountPayload }) => {
            const { data, error } = await api.tenant["bank-accounts"]({ bankAccountId }).patch(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bankAccounts"] })
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })

    const deleteBankAccountMutation = useMutation({
        mutationFn: async (bankAccountId: string) => {
            const { data, error } = await api.tenant["bank-accounts"]({ bankAccountId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bankAccounts"] })
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })

    return {
        bankAccounts: bankAccountsQuery.data,
        bankAccountsIsPending: bankAccountsQuery.isPending,
        bankAccountsIsError: bankAccountsQuery.isError,
        createBankAccount: createBankAccountMutation.mutateAsync,
        createBankAccountIsPending: createBankAccountMutation.isPending,
        updateBankAccount: updateBankAccountMutation.mutateAsync,
        updateBankAccountIsPending: updateBankAccountMutation.isPending,
        deleteBankAccount: deleteBankAccountMutation.mutateAsync,
        deleteBankAccountIsPending: deleteBankAccountMutation.isPending,
    }
}

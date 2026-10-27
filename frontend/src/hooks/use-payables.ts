import { api } from "@/lib/api"
import { throwApiError } from "@/lib/api-error"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type PayableStatusFilter = "pending" | "paid" | "overdue" | "all"
export type PayableReferenceFilter = string | "none" | undefined
export type InstallmentMode = "recurring" | "installment"
export type PayablePaymentMethod = "cash" | "pix" | "debit" | "credit" | "voucher"

export type PayableFilters = {
    startDate: string
    endDate: string
    payeeId?: PayableReferenceFilter
    bankAccountId?: PayableReferenceFilter
    categoryId?: PayableReferenceFilter
    status: PayableStatusFilter
    page: number
    pageSize: number
}

export type CreatePayablePayload = {
    description: string
    amount: number
    dueDate: string
    paymentMethod?: PayablePaymentMethod | null
    payeeId?: string | null
    categoryId?: string | null
    bankAccountId?: string | null
    notes?: string | null
    installments?: { count?: number, mode?: InstallmentMode }
}

export type UpdatePayablePayload = Partial<Omit<CreatePayablePayload, "installments">>

type QueryFilters = Omit<PayableFilters, "page" | "pageSize">

function buildQuery(filters: QueryFilters) {
    return {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        ...(filters.payeeId === undefined ? {} : { payeeId: filters.payeeId }),
        ...(filters.bankAccountId === undefined ? {} : { bankAccountId: filters.bankAccountId }),
        ...(filters.categoryId === undefined ? {} : { categoryId: filters.categoryId }),
    }
}

export function usePayables(filters: PayableFilters, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: ["payables", filters],
        queryFn: async () => {
            const { data, error } = await api.tenant.payables.get({
                query: {
                    ...buildQuery(filters),
                    page: String(filters.page),
                    pageSize: String(filters.pageSize),
                },
            })
            if (error) throwApiError(error)
            return data
        },
        placeholderData: keepPreviousData,
        enabled: options.enabled ?? true,
    })
}

export function useExportPayables() {
    return useMutation({
        mutationFn: async (filters: QueryFilters) => {
            const { data, error } = await api.tenant.payables.export.get({
                query: buildQuery(filters),
            })
            if (error) throwApiError(error)
            return data
        },
    })
}

export function useCreatePayable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payload: CreatePayablePayload) => {
            const { data, error } = await api.tenant.payables.post(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })
}

export function useUpdatePayable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ payableId, payload }: { payableId: string, payload: UpdatePayablePayload }) => {
            const { data, error } = await api.tenant.payables({ payableId }).patch(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })
}

export function useDeletePayable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ payableId, scope = "single" }: { payableId: string, scope?: "single" | "group" }) => {
            const { data, error } = await api.tenant.payables({ payableId }).delete({ query: { scope } })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })
}

export function usePayPayable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ payableId, payload }: {
            payableId: string
            payload: {
                paidDate: string
                bankAccountId?: string | null
                paymentMethod?: PayablePaymentMethod | null
            }
        }) => {
            const { data, error } = await api.tenant.payables({ payableId }).pay.post(payload)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })
}

export function useReversePayable() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (payableId: string) => {
            const { data, error } = await api.tenant.payables({ payableId }).reverse.post()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payables"] })
        },
    })
}

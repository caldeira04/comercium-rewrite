import { api } from "@/lib/api"
import { throwApiError } from "@/lib/api-error"
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"

export type ReceivableStatusFilter = "paid" | "refunded" | "all"
export type ReceivableClientFilter = number | "none" | undefined

export type ReceivableFilters = {
    startDate: string
    endDate: string
    clientId?: ReceivableClientFilter
    status: ReceivableStatusFilter
    page: number
    pageSize: number
}

type QueryFilters = Omit<ReceivableFilters, "page" | "pageSize">
type ExportFilters = Omit<ReceivableFilters, "page" | "pageSize">

function buildQuery(filters: QueryFilters) {
    return {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        ...(filters.clientId === undefined ? {} : { clientId: String(filters.clientId) }),
    }
}

export function useReceivables(filters: ReceivableFilters, options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: ["receivables", filters],
        queryFn: async () => {
            const { data, error } = await api.tenant.receivables.get({
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

export function useExportReceivables() {
    return useMutation({
        mutationFn: async (filters: ExportFilters) => {
            const { data, error } = await api.tenant.receivables.export.get({
                query: buildQuery(filters),
            })
            if (error) throwApiError(error)
            return data
        },
    })
}

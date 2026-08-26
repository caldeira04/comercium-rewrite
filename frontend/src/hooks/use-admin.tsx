import { useMutation, useQuery } from "@tanstack/react-query"
import type {
    Announcement,
    BillingSummary,
    HealthData,
    Pagination,
    SearchResults,
    TenantDetail,
    TenantListItem,
} from "@/lib/admin-api-types"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

const adminBase = api.master.admin

export function useAdminOverview() {
    return useQuery({
        queryKey: ["admin", "overview"],
        queryFn: async () => {
            const { data, error } = await adminBase.overview.get()
            if (error) throwApiError(error)
            return data
        },
        refetchInterval: 60_000,
    })
}

export type TenantStatus = "all" | "active" | "inactive" | "deleted"

export function useAdminTenants(params: {
    q?: string
    status?: TenantStatus
    plan?: string
    sort?: string
    page?: number
    pageSize?: number
} = {}) {
    const query = useQuery({
        queryKey: ["admin", "tenants", params],
        queryFn: async () => {
            const { data, error } = await adminBase.tenants.get({
                query: {
                    q: params.q || undefined,
                    status: params.status,
                    plan: params.plan,
                    sort: params.sort,
                    page: params.page ? String(params.page) : undefined,
                    pageSize: params.pageSize ? String(params.pageSize) : undefined,
                }
            })
            if (error) throwApiError(error)
            return data as { tenants: Array<TenantListItem>, pagination: Pagination }
        },
    })

    return query
}

export function useAdminTenant(tenantId: string) {
    return useQuery({
        queryKey: ["admin", "tenant", tenantId],
        queryFn: async () => {
            const { data, error } = await adminBase.tenants({ tenantId }).get()
            if (error) throwApiError(error)
            return data as TenantDetail
        },
        enabled: !!tenantId,
    })
}

export function useAdminTenantMutations() {
    const updateMutation = useMutation({
        mutationFn: async ({ tenantId, settings }: { tenantId: string, settings: Record<string, unknown> }) => {
            const { data, error } = await adminBase.tenants({ tenantId }).patch(settings)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "tenant", vars.tenantId] })
            queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (tenantId: string) => {
            const { data, error } = await adminBase.tenants({ tenantId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] })
            queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })
        }
    })

    return { updateTenant: updateMutation.mutateAsync, deleteTenant: deleteMutation.mutateAsync }
}

export function useAdminUsers(params: {
    q?: string
    tenantId?: string
    page?: number
    pageSize?: number
} = {}) {
    const query = useQuery({
        queryKey: ["admin", "users", params],
        queryFn: async () => {
            const { data, error } = await adminBase.users.get({
                query: {
                    q: params.q || undefined,
                    tenantId: params.tenantId,
                    page: params.page ? String(params.page) : undefined,
                    pageSize: params.pageSize ? String(params.pageSize) : undefined,
                }
            })
            if (error) throwApiError(error)
            return data
        },
    })

    const setActiveMutation = useMutation({
        mutationFn: async ({ userId, isActive }: { userId: string, isActive: boolean }) => {
            const { data, error } = await adminBase.users({ userId }).patch({ isActive })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
            queryClient.invalidateQueries({ queryKey: ["admin", "tenant"] })
        }
    })

    return {
        ...query,
        setUserActive: setActiveMutation.mutateAsync,
        setUserActiveIsPending: setActiveMutation.isPending,
    }
}

export function useAdminAudit(params: {
    action?: string
    targetType?: string
    page?: number
    pageSize?: number
} = {}) {
    return useQuery({
        queryKey: ["admin", "audit", params],
        queryFn: async () => {
            const { data, error } = await adminBase.audit.get({
                query: {
                    action: params.action,
                    targetType: params.targetType,
                    page: params.page ? String(params.page) : undefined,
                    pageSize: params.pageSize ? String(params.pageSize) : undefined,
                }
            })
            if (error) throwApiError(error)
            return data
        },
    })
}

export function useAdminHealth() {
    return useQuery({
        queryKey: ["admin", "health"],
        queryFn: async () => {
            const { data, error } = await adminBase.health.get()
            if (error) throwApiError(error)
            return data as HealthData
        },
        refetchInterval: 60_000,
    })
}

export function useAdminBilling() {
    return useQuery({
        queryKey: ["admin", "billing"],
        queryFn: async () => {
            const { data, error } = await adminBase.billing.summary.get()
            if (error) throwApiError(error)
            return data as BillingSummary
        },
    })
}

export function useAdminFiscal() {
    const overview = useQuery({
        queryKey: ["admin", "fiscal", "overview"],
        queryFn: async () => {
            const { data, error } = await adminBase.fiscal.overview.get()
            if (error) throwApiError(error)
            return data
        },
    })

    return { ...overview }
}

export function useAdminFlags() {
    const query = useQuery({
        queryKey: ["admin", "flags"],
        queryFn: async () => {
            const { data, error } = await adminBase.flags.get()
            if (error) throwApiError(error)
            return data
        },
    })

    const createMutation = useMutation({
        mutationFn: async (input: { key: string, description?: string, scope: "global" | "tenant", tenantId?: string | null, enabled?: boolean }) => {
            const { data, error } = await adminBase.flags.post(input)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "flags"] })
    })

    const updateMutation = useMutation({
        mutationFn: async ({ flagId, input }: { flagId: string, input: {
            key?: string
            description?: string
            scope?: "global" | "tenant"
            tenantId?: string | null
            enabled?: boolean
        } }) => {
            const { data, error } = await adminBase.flags({ flagId }).patch(input)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "flags"] })
    })

    const deleteMutation = useMutation({
        mutationFn: async (flagId: string) => {
            const { data, error } = await adminBase.flags({ flagId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "flags"] })
    })

    return {
        ...query,
        createFlag: createMutation.mutateAsync,
        createFlagIsPending: createMutation.isPending,
        updateFlag: updateMutation.mutateAsync,
        updateFlagIsPending: updateMutation.isPending,
        deleteFlag: deleteMutation.mutateAsync,
        deleteFlagIsPending: deleteMutation.isPending,
    }
}

export function useAdminAnnouncements() {
    const query = useQuery({
        queryKey: ["admin", "announcements"],
        queryFn: async () => {
            const { data, error } = await adminBase.announcements.get()
            if (error) throwApiError(error)
            return data
        },
    })

    const createMutation = useMutation({
        mutationFn: async (input: { title: string, body: string, scope: "global" | "tenant", tenantId?: string | null, isActive?: boolean }) => {
            const { data, error } = await adminBase.announcements.post(input)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] })
    })

    const updateMutation = useMutation({
        mutationFn: async ({ announcementId, input }: { announcementId: string, input: Partial<Announcement> }) => {
            const { data, error } = await adminBase.announcements({ announcementId }).patch(input)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] })
    })

    const deleteMutation = useMutation({
        mutationFn: async (announcementId: string) => {
            const { data, error } = await adminBase.announcements({ announcementId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] })
    })

    return {
        ...query,
        createAnnouncement: createMutation.mutateAsync,
        createAnnouncementIsPending: createMutation.isPending,
        updateAnnouncement: updateMutation.mutateAsync,
        updateAnnouncementIsPending: updateMutation.isPending,
        deleteAnnouncement: deleteMutation.mutateAsync,
        deleteAnnouncementIsPending: deleteMutation.isPending,
    }
}

export function useAdminSearch(query: string) {
    return useQuery({
        queryKey: ["admin", "search", query],
        queryFn: async () => {
            const { data, error } = await adminBase.search.get({ query: { q: query } })
            if (error) throwApiError(error)
            return data as SearchResults
        },
        enabled: query.trim().length > 0,
    })
}

export function useImpersonate() {
    return useMutation({
        mutationFn: async (tenantUserId: string) => {
            const { data, error } = await adminBase.impersonate.post({ tenantUserId })
            if (error) throwApiError(error)
            return data
        },
    })
}
import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export type TenantSettings = {
    name?: string
    legalName?: string
    document?: string
    email?: string
    phone?: string
    zipcode?: string
    street?: string
    state?: string
    district?: string
    city?: string
    number?: string
    country?: string
    logoUrl?: string
    primaryColor?: string
    timezone?: string
    currency?: string
}

export function useTenant(tenantId?: string) {

    const tenantQuery = useQuery({
        queryKey: ["tenant", tenantId],
        queryFn: async () => {
            const { data, error } = await api.master.tenants({ tenantId: tenantId! }).get()
            if (error) throwApiError(error)
            return data
        },
        enabled: !!tenantId,
    })

    const updateTenantMutation = useMutation({
        mutationFn: async ({ tenantId, settings }: {
            tenantId: string
            settings: TenantSettings
        }) => {
            const { data, error } = await api.master.tenants({ tenantId }).patch(settings, {
                fetch: { credentials: "include" }
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenant"] })
        }
    })

    return {
        tenant: tenantQuery.data,
        tenantIsPending: tenantQuery.isPending,
        tenantIsError: tenantQuery.isError,
        updateTenant: updateTenantMutation.mutateAsync,
        updateTenantIsPending: updateTenantMutation.isPending,
        updateTenantIsError: updateTenantMutation.isError,
    }
}
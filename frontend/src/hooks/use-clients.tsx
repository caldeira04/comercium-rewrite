import { api } from "@/lib/api"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { throwApiError } from "@/lib/api-error"

type CreateClientInput = {
    name: string
    document?: string
    email?: string
    phone?: string
}

type EditClientInput = {
    client: {
        name: string
        document?: string
        email?: string
        phone?: string
    }
    clientId: number
}

export function useClients() {
    const queryClient = useQueryClient()

    const clientsQuery = useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const { data, error } = await api.tenant.clients.get({
                headers: {
                    credentials: "include"
                }
            })
            if (error) throwApiError(error)
            return data
        },
    })

    const createClientMutation = useMutation({
        mutationFn: async (client: CreateClientInput) => {
            const { data, error } = await api.tenant.clients.post(client, {
                headers: {
                    credentials: "include"
                }
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] })
        },
    })

    const editClientMutation = useMutation({
        mutationFn: async ({ client, clientId }: EditClientInput) => {
            const { data, error } = await api.tenant.clients({ clientId }).patch(client)
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] })
        }
    })

    return {
        clients: clientsQuery.data,
        clientsIsPending: clientsQuery.isPending,
        clientsIsError: clientsQuery.isError,
        createClient: createClientMutation.mutateAsync,
        createClientIsPending: createClientMutation.isPending,
        editClient: editClientMutation.mutateAsync,
        editClientIsPending: editClientMutation.isPending
    }
}

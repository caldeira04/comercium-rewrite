import { api } from "@/lib/api"
import { useMutation, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { throwApiError } from "@/lib/api-error"

export function useUsers() {

    const usersQuery = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const { data, error } = await api.master.users.get()
            if (error) throwApiError(error)
            return data
        }
    })

    const createUserMutation = useMutation({
        mutationFn: async ({ login, password }: {
            login: string
            password: string
        }) => {
            const { data, error } = await api.master.users.post({
                login,
                password
            }, {
                fetch: { credentials: "include" }
            })
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
        }
    })

    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await api.master.users({ userId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
        }
    })

    return {
        users: usersQuery.data,
        usersIsPending: usersQuery.isPending,
        usersIsError: usersQuery.isError,
        createUser: createUserMutation.mutateAsync,
        createUserIsPending: createUserMutation.isPending,
        createUserIsError: createUserMutation.isError,
        deleteUser: deleteUserMutation.mutateAsync,
        deleteUserIsPending: deleteUserMutation.isPending,
        deleteUserIsError: deleteUserMutation.isError,
    }
}
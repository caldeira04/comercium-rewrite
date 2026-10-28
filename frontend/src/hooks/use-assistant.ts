import { api } from "@/lib/api"
import { throwApiError } from "@/lib/api-error"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type AssistantToolUsage = {
    name: string
    label: string
}

export type AssistantSource = {
    title: string
    sourceFile: string
}

export type AssistantChatPayload = {
    message: string
    conversationId?: string
}

const conversationsKey = ["assistant-conversations"]

export function useAssistant() {
    const queryClient = useQueryClient()

    const conversationsQuery = useQuery({
        queryKey: conversationsKey,
        queryFn: async () => {
            const { data, error } = await api.tenant.assistant.conversations.get()
            if (error) throwApiError(error)
            return data
        },
    })

    async function fetchConversation(conversationId: string) {
        return await queryClient.fetchQuery({
            queryKey: ["assistant-conversation", conversationId],
            queryFn: async () => {
                const { data, error } = await api.tenant.assistant.conversations({ conversationId }).get()
                if (error) throwApiError(error)
                return data
            },
            staleTime: 0,
        })
    }

    const sendMessageMutation = useMutation({
        mutationFn: async (payload: AssistantChatPayload) => {
            const { data, error } = await api.tenant.assistant.chat.post(payload)
            if (error) throwApiError(error, "Não foi possível responder agora.")
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: conversationsKey })
        },
    })

    const deleteConversationMutation = useMutation({
        mutationFn: async (conversationId: string) => {
            const { data, error } = await api.tenant.assistant.conversations({ conversationId }).delete()
            if (error) throwApiError(error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: conversationsKey })
        },
    })

    return {
        conversations: conversationsQuery.data ?? [],
        isLoadingConversations: conversationsQuery.isLoading,
        fetchConversation,
        sendMessage: sendMessageMutation.mutateAsync,
        deleteConversation: deleteConversationMutation.mutateAsync,
    }
}

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
    attachmentId?: string
}

export type AssistantAttachment = {
    id: string
    fileName: string
}

type ChatResponse = NonNullable<Awaited<ReturnType<typeof api.tenant.assistant.chat.post>>["data"]>

export type AssistantAction = ChatResponse["actions"][number]
export type AssistantActionValues = AssistantAction["values"]
export type AssistantDownload = ChatResponse["downloads"][number]

export type ConfirmActionPayload = {
    actionId: string
    values: AssistantActionValues
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

    const uploadAttachmentMutation = useMutation({
        mutationFn: async (file: File) => {
            const { data, error } = await api.tenant.assistant.attachments.post({ file })
            if (error) throwApiError(error, "Não foi possível enviar o arquivo.")
            return data
        },
    })

    const confirmActionMutation = useMutation({
        mutationFn: async ({ actionId, values }: ConfirmActionPayload) => {
            const { data, error } = await api.tenant.assistant.actions({ actionId }).confirm.post({ values })
            if (error) throwApiError(error, "Não foi possível executar a ação.")
            return data
        },
        // A ação pode ter criado ou alterado contas, clientes ou produtos
        onSuccess: () => {
            queryClient.invalidateQueries()
        },
    })

    const rejectActionMutation = useMutation({
        mutationFn: async (actionId: string) => {
            const { data, error } = await api.tenant.assistant.actions({ actionId }).reject.post()
            if (error) throwApiError(error, "Não foi possível cancelar a ação.")
            return data
        },
    })

    return {
        conversations: conversationsQuery.data ?? [],
        isLoadingConversations: conversationsQuery.isLoading,
        fetchConversation,
        sendMessage: sendMessageMutation.mutateAsync,
        deleteConversation: deleteConversationMutation.mutateAsync,
        uploadAttachment: uploadAttachmentMutation.mutateAsync,
        isUploadingAttachment: uploadAttachmentMutation.isPending,
        confirmAction: confirmActionMutation.mutateAsync,
        rejectAction: rejectActionMutation.mutateAsync,
    }
}

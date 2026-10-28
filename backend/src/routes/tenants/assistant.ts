import { Elysia, t } from "elysia"
import { checkAssistantRateLimit } from "../../domain/assistant/AssistantService"
import {
    deleteAssistantConversation,
    getAssistantConversation,
    listAssistantConversations,
    runAssistantChat,
} from "../../domain/assistant/AssistantAgent"
import { authPlugin } from "../../utils/elysia"
import { AppError } from "../../utils/errors"

const conversationParams = t.Object({
    conversationId: t.String(),
})

const assistant = new Elysia({ prefix: "/assistant" })
    .use(authPlugin)
    .post("/chat", async ({ body, auth }) => {
        if (!body.message.trim()) {
            throw new AppError("escreva uma pergunta", 422, "INVALID_ASSISTANT_MESSAGE")
        }

        checkAssistantRateLimit(String(auth.userId))
        return await runAssistantChat({
            tenantSlug: auth.tenantSlug,
            tenantName: auth.tenantName,
            timeZone: auth.tenantTimezone,
            userId: auth.userId,
            message: body.message.trim(),
            conversationId: body.conversationId,
        })
    }, {
        body: t.Object({
            message: t.String({ minLength: 1, maxLength: 2000 }),
            conversationId: t.Optional(t.String()),
        }),
    })

    .get("/conversations", async ({ auth }) => {
        return await listAssistantConversations(auth.tenantSlug, auth.userId)
    })

    .get("/conversations/:conversationId", async ({ params, auth }) => {
        return await getAssistantConversation(auth.tenantSlug, params.conversationId, auth.userId)
    }, {
        params: conversationParams,
    })

    .delete("/conversations/:conversationId", async ({ params, auth }) => {
        return await deleteAssistantConversation(auth.tenantSlug, params.conversationId, auth.userId)
    }, {
        params: conversationParams,
    })

export default assistant

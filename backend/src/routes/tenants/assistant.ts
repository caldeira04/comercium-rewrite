import { Elysia, t } from "elysia"
import { checkAssistantRateLimit } from "../../domain/assistant/AssistantService"
import { MAX_ATTACHMENT_BYTES, saveAssistantAttachment } from "../../domain/assistant/attachments"
import {
    confirmAssistantAction,
    deleteAssistantConversation,
    getAssistantConversation,
    listAssistantConversations,
    rejectAssistantAction,
    runAssistantChat,
} from "../../domain/assistant/AssistantAgent"
import { authPlugin } from "../../utils/elysia"
import { AppError } from "../../utils/errors"

const conversationParams = t.Object({
    conversationId: t.String(),
})

const actionScalar = t.Union([t.String(), t.Number(), t.Boolean(), t.Null()])

const actionParams = t.Object({
    actionId: t.String(),
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
            attachmentId: body.attachmentId,
        })
    }, {
        body: t.Object({
            message: t.String({ minLength: 1, maxLength: 2000 }),
            conversationId: t.Optional(t.String()),
            attachmentId: t.Optional(t.String()),
        }),
    })

    .post("/attachments", async ({ body, auth }) => {
        return await saveAssistantAttachment(auth.tenantSlug, auth.userId, body.file)
    }, {
        body: t.Object({
            file: t.File({ maxSize: MAX_ATTACHMENT_BYTES }),
        }),
    })

    .get("/conversations", async ({ auth }) => {
        return await listAssistantConversations(auth.tenantSlug, auth.userId)
    })

    .get("/conversations/:conversationId", async ({ params, auth }) => {
        return await getAssistantConversation(auth.tenantSlug, params.conversationId, auth.userId, auth.tenantTimezone)
    }, {
        params: conversationParams,
    })

    .delete("/conversations/:conversationId", async ({ params, auth }) => {
        return await deleteAssistantConversation(auth.tenantSlug, params.conversationId, auth.userId)
    }, {
        params: conversationParams,
    })

    .post("/actions/:actionId/confirm", async ({ params, body, auth }) => {
        return await confirmAssistantAction({
            tenantSlug: auth.tenantSlug,
            timeZone: auth.tenantTimezone,
            userId: auth.userId,
            actionId: params.actionId,
            values: body.values,
        })
    }, {
        params: actionParams,
        body: t.Object({
            values: t.Optional(t.Record(t.String(), t.Union([
                actionScalar,
                t.Array(t.Record(t.String(), actionScalar), { maxItems: 50 }),
            ]))),
        }),
    })

    .post("/actions/:actionId/reject", async ({ params, auth }) => {
        return await rejectAssistantAction({
            tenantSlug: auth.tenantSlug,
            timeZone: auth.tenantTimezone,
            userId: auth.userId,
            actionId: params.actionId,
        })
    }, {
        params: actionParams,
    })

export default assistant

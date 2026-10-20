import { Elysia, t } from "elysia"
import { answerAssistantQuestion, checkAssistantRateLimit } from "../../domain/assistant/AssistantService"
import { authPlugin } from "../../utils/elysia"
import { AppError } from "../../utils/errors"

const assistant = new Elysia({ prefix: "/assistant" })
    .use(authPlugin)
    .post("/chat", async ({ body, auth }) => {
        if (!body.message.trim()) {
            throw new AppError("escreva uma pergunta", 422, "INVALID_ASSISTANT_MESSAGE")
        }

        checkAssistantRateLimit(String(auth.userId))
        return await answerAssistantQuestion(body.message.trim())
    }, {
        body: t.Object({
            message: t.String({ minLength: 1, maxLength: 2000 }),
        }),
    })

export default assistant

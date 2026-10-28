import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import path from "node:path"
import { eq } from "drizzle-orm"
import { db } from "../../db/db"
import { assistantKnowledgeChunk, assistantKnowledgeDocument } from "../../db/schema/master"
import { AppError } from "../../utils/errors"

const WORKING_DIRECTORY_KNOWLEDGE_DIR = path.resolve(process.cwd(), "knowledge")
const KNOWLEDGE_DIR = process.env.COMERCIUM_KNOWLEDGE_DIR
    ?? (existsSync(WORKING_DIRECTORY_KNOWLEDGE_DIR)
        ? WORKING_DIRECTORY_KNOWLEDGE_DIR
        : path.resolve(import.meta.dir, "../../../knowledge"))
const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL ?? "text-embedding-3-small"
const CHAT_MODEL = process.env.OPENROUTER_CHAT_MODEL ?? "openai/gpt-oss-120b:free"
const AGENT_MODEL = process.env.OPENROUTER_AGENT_MODEL?.trim() || CHAT_MODEL
const MAX_EMBEDDING_BATCH_SIZE = 32

let indexing: Promise<void> | undefined

export type ChatToolCall = {
    id: string
    type: "function"
    function: { name: string; arguments: string }
}

export type ChatMessage =
    | { role: "system" | "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: ChatToolCall[] }
    | { role: "tool"; content: string; tool_call_id: string }

export type ChatCompletionRequest = {
    messages: ChatMessage[]
    tools?: unknown[]
    toolChoice?: "auto" | "none"
}

export type ChatCompletionResult = {
    content: string | null
    toolCalls: ChatToolCall[]
}

type OpenRouterResponse = {
    data?: { index: number; embedding: number[] }[]
    choices?: { message?: { content?: unknown; tool_calls?: unknown } }[]
}

function getApiKey() {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim()
    if (!apiKey) {
        throw new AppError("assistente de IA não configurado", 503, "ASSISTANT_NOT_CONFIGURED")
    }

    return apiKey
}

async function openRouter(pathname: string, body: unknown) {
    const apiKey = getApiKey()
    let response: Response

    try {
        response = await fetch(`https://openrouter.ai/api/v1/${pathname}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60_000),
        })
    } catch {
        throw new AppError("assistente temporariamente indisponível", 502, "ASSISTANT_PROVIDER_ERROR")
    }

    if (!response.ok) {
        console.error(`OpenRouter ${pathname} request failed with status ${response.status}`)
        throw new AppError("assistente temporariamente indisponível", 502, "ASSISTANT_PROVIDER_ERROR")
    }

    try {
        return await response.json() as OpenRouterResponse
    } catch {
        throw new AppError("resposta inválida do serviço de IA", 502, "ASSISTANT_PROVIDER_ERROR")
    }
}

async function embedMany(inputs: string[]) {
    if (inputs.length === 0) return []

    const data: { index: number; embedding: number[] }[] = []
    for (let start = 0; start < inputs.length; start += MAX_EMBEDDING_BATCH_SIZE) {
        const batch = inputs.slice(start, start + MAX_EMBEDDING_BATCH_SIZE)
        const result = await openRouter("embeddings", {
            model: EMBEDDING_MODEL,
            input: batch,
        })

        if (!Array.isArray(result.data) || result.data.length !== batch.length) {
            throw new AppError("resposta inválida do serviço de IA", 502, "ASSISTANT_PROVIDER_ERROR")
        }

        data.push(...result.data.sort((a, b) => a.index - b.index))
    }

    return data.map((item) => item.embedding)
}

function chunkDocument(markdown: string) {
    return markdown
        .split(/(?=^## )/m)
        .map((section) => section.trim())
        .filter((section) => section.length > 20)
        .map((content) => ({
            title: content.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim() ?? "Comercium",
            content,
        }))
}

async function syncKnowledgeBase() {
    getApiKey()

    const glob = new Bun.Glob("*.md")
    const files: string[] = []
    for await (const file of glob.scan({ cwd: KNOWLEDGE_DIR })) files.push(file)

    const existingDocuments = await db.select().from(assistantKnowledgeDocument)
    const existingBySource = new Map(existingDocuments.map((document) => [document.sourceFile, document]))
    const currentFiles = new Set(files)

    if (files.length === 0) {
        console.warn(`Assistant knowledge directory is empty: ${KNOWLEDGE_DIR}`)
    }

    for (const sourceFile of files.sort()) {
        const markdown = await Bun.file(path.join(KNOWLEDGE_DIR, sourceFile)).text()
        const contentHash = createHash("sha256").update(markdown).digest("hex")
        if (existingBySource.get(sourceFile)?.contentHash === contentHash) continue

        const sections = chunkDocument(markdown)
        const embeddings = await embedMany(sections.map((section) => section.content))
        const indexedAt = new Date().toISOString()

        await db.transaction(async (tx) => {
            await tx.delete(assistantKnowledgeChunk)
                .where(eq(assistantKnowledgeChunk.sourceFile, sourceFile))
            await tx.delete(assistantKnowledgeDocument)
                .where(eq(assistantKnowledgeDocument.sourceFile, sourceFile))

            if (sections.length > 0) {
                await tx.insert(assistantKnowledgeChunk).values(sections.map((section, chunkIndex) => ({
                    sourceFile,
                    chunkIndex,
                    title: section.title,
                    content: section.content,
                    embedding: JSON.stringify(embeddings[chunkIndex]),
                })))
            }

            await tx.insert(assistantKnowledgeDocument).values({
                sourceFile,
                contentHash,
                indexedAt,
            })
        })

        console.log(`Indexed assistant knowledge document: ${sourceFile}`)
    }

    for (const document of existingDocuments) {
        if (currentFiles.has(document.sourceFile)) continue

        await db.transaction(async (tx) => {
            await tx.delete(assistantKnowledgeChunk)
                .where(eq(assistantKnowledgeChunk.sourceFile, document.sourceFile))
            await tx.delete(assistantKnowledgeDocument)
                .where(eq(assistantKnowledgeDocument.sourceFile, document.sourceFile))
        })
    }
}

async function ensureKnowledgeBase() {
    if (!indexing) {
        indexing = syncKnowledgeBase().catch((error) => {
            indexing = undefined
            throw error
        })
    }

    await indexing
}

export function initializeAssistantKnowledgeBase() {
    if (!process.env.OPENROUTER_API_KEY?.trim()) return

    void ensureKnowledgeBase().catch((error) => {
        console.error("Assistant knowledge indexing failed:", error)
    })
}

function cosineSimilarity(a: number[], b: number[]) {
    if (a.length !== b.length || a.length === 0) return 0

    let dot = 0
    let magnitudeA = 0
    let magnitudeB = 0

    for (let index = 0; index < a.length; index++) {
        dot += a[index] * b[index]
        magnitudeA += a[index] * a[index]
        magnitudeB += b[index] * b[index]
    }

    const denominator = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)
    return denominator === 0 ? 0 : dot / denominator
}

export async function searchKnowledge(query: string, limit = 5) {
    await ensureKnowledgeBase()

    const queryEmbedding = (await embedMany([query]))[0]
    const rows = await db.select().from(assistantKnowledgeChunk)

    return rows
        .map((row) => ({
            title: row.title,
            sourceFile: row.sourceFile,
            content: row.content,
            score: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding) as number[]),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ score: _score, ...chunk }) => chunk)
}

function parseToolCalls(value: unknown): ChatToolCall[] {
    if (!Array.isArray(value)) return []

    return value.flatMap((call) => {
        const fn = call?.function
        if (typeof call?.id !== "string" || typeof fn?.name !== "string") return []

        return [{
            id: call.id,
            type: "function" as const,
            function: {
                name: fn.name,
                arguments: typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? {}),
            },
        }]
    })
}

export async function chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const result = await openRouter("chat/completions", {
        model: AGENT_MODEL,
        messages: request.messages,
        ...(request.tools?.length
            ? { tools: request.tools, tool_choice: request.toolChoice ?? "auto" }
            : {}),
    })

    const message = result.choices?.[0]?.message
    if (!message) {
        throw new AppError("resposta inválida do serviço de IA", 502, "ASSISTANT_PROVIDER_ERROR")
    }

    return {
        content: typeof message.content === "string" ? message.content : null,
        toolCalls: parseToolCalls(message.tool_calls),
    }
}

export function checkAssistantRateLimit(userId: string) {
    const now = Date.now()
    const windowMs = 60_000
    const requestLimit = 12
    const current = requestsByUser.get(userId)?.filter((timestamp) => now - timestamp < windowMs) ?? []

    if (current.length >= requestLimit) {
        throw new AppError("limite de perguntas atingido; tente novamente em um minuto", 429, "ASSISTANT_RATE_LIMITED")
    }

    current.push(now)
    requestsByUser.set(userId, current)

    if (requestsByUser.size > 1000) {
        for (const [storedUserId, timestamps] of requestsByUser) {
            if (timestamps.every((timestamp) => now - timestamp >= windowMs)) {
                requestsByUser.delete(storedUserId)
            }
        }
    }
}

const requestsByUser = new Map<string, number[]>()

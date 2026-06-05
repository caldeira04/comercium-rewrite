type ApiErrorBody = {
    error?: string
    message?: string
}

export function getApiErrorMessage(error: unknown, fallback = "Erro ao processar solicitação") {
    const extractedMessage = extractApiErrorMessage(error)
    if (extractedMessage) return extractedMessage

    if (error instanceof Error && isUsefulMessage(error.message)) return error.message

    if (typeof error === "string" && isUsefulMessage(error)) return error

    return fallback
}

function extractApiErrorMessage(error: unknown, seen = new WeakSet<object>()): string | null {
    if (!error || typeof error !== "object") return null

    if (seen.has(error)) return null
    seen.add(error)

    const record = error as Record<string, unknown>

    if (typeof record.message === "string" && isUsefulMessage(record.message)) return record.message
    if (typeof record.error === "string" && isUsefulMessage(record.error)) return record.error

    for (const value of Object.values(record)) {
        const message = extractApiErrorMessage(value, seen)
        if (message) return message
    }

    return null
}

function isUsefulMessage(message: string) {
    return message.trim() !== "" && message !== "[object Object]"
}

export function throwApiError(error: unknown, fallback?: string): never {
    throw new Error(getApiErrorMessage(error, fallback))
}

export async function getResponseErrorMessage(response: Response, fallback = "Erro ao processar solicitação") {
    try {
        const body = await response.json() as ApiErrorBody
        return body.message || body.error || fallback
    } catch {
        return fallback
    }
}

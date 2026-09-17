import { AppError } from "../../../utils/errors"
import type { FocusErrorBody, FocusNfceResponse } from "./nfce-types"
import { getFocusConfig } from "./focus-config"

export type FocusHttpMethod = "GET" | "POST" | "DELETE"

export type FocusRequestOptions = {
    method: FocusHttpMethod
    path: string
    query?: Record<string, string>
    body?: unknown
    fetchImpl?: typeof fetch
    timeoutMs?: number
}

function basicAuthHeader(token: string): string {
    return `Basic ${Buffer.from(`${token}:`).toString("base64")}`
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string>): string {
    const url = new URL(`${baseUrl}${path}`)
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            url.searchParams.set(key, value)
        }
    }
    return url.toString()
}

async function parseBody(res: Response): Promise<unknown> {
    const text = await res.text()
    if (!text) return null
    try {
        return JSON.parse(text) as unknown
    } catch {
        return { mensagem: text.slice(0, 2000) } satisfies FocusErrorBody
    }
}

export async function focusRequest<T = FocusNfceResponse>(options: FocusRequestOptions): Promise<T> {
    const config = getFocusConfig()

    if (!config.configured || !config.token) {
        throw new AppError("integração fiscal não configurada", 409, "FISCAL_NOT_CONFIGURED")
    }

    const fetchImpl = options.fetchImpl ?? fetch
    const controller = new AbortController()
    const timeoutMs = options.timeoutMs ?? 30000
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const res = await fetchImpl(buildUrl(config.baseUrl, options.path, options.query), {
            method: options.method,
            headers: {
                Authorization: basicAuthHeader(config.token),
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        })

        const data = (await parseBody(res)) as T & FocusErrorBody

        if (res.status === 401) {
            throw new AppError("token da Focus NFe inválido", 401, "FOCUS_UNAUTHORIZED")
        }
        if (res.status === 403) {
            throw new AppError(data?.mensagem ?? "CNPJ do emitente não autorizado na Focus", 403, "FOCUS_FORBIDDEN")
        }
        if (res.status === 404) {
            throw new AppError(data?.mensagem ?? "documento fiscal não encontrado na Focus", 404, "FOCUS_NOT_FOUND")
        }
        if (res.status === 429) {
            throw new AppError("limite de requisições da Focus excedido, tente novamente", 429, "FOCUS_RATE_LIMITED")
        }
        if (res.status >= 400) {
            const message =
                data?.mensagem ??
                (typeof data === "string" ? data : "erro na integração fiscal")
            throw new AppError(String(message).slice(0, 500), res.status >= 500 ? 502 : 422, "FOCUS_REQUEST_FAILED")
        }

        return data
    } catch (error) {
        if (error instanceof AppError) throw error
        if (error instanceof Error && error.name === "AbortError") {
            throw new AppError("tempo esgotado na comunicação com a Focus", 504, "FOCUS_TIMEOUT")
        }
        throw new AppError("falha ao comunicar com a Focus NFe", 502, "FOCUS_UNREACHABLE")
    } finally {
        clearTimeout(timeout)
    }
}

export function emitNfceRequest(ref: string, payload: unknown, fetchImpl?: typeof fetch) {
    return focusRequest<FocusNfceResponse>({
        method: "POST",
        path: "/v2/nfce",
        query: { ref },
        body: payload,
        fetchImpl,
    })
}

export function getNfceRequest(ref: string, completa = true, fetchImpl?: typeof fetch) {
    return focusRequest<FocusNfceResponse>({
        method: "GET",
        path: `/v2/nfce/${encodeURIComponent(ref)}`,
        query: { completa: completa ? "1" : "0" },
        fetchImpl,
    })
}

export function cancelNfceRequest(ref: string, justificativa: string, fetchImpl?: typeof fetch) {
    if (justificativa.trim().length < 15 || justificativa.trim().length > 255) {
        throw new AppError("justificativa do cancelamento deve ter entre 15 e 255 caracteres", 400, "INVALID_CANCEL_JUSTIFICATIVA")
    }

    return focusRequest<FocusNfceResponse>({
        method: "DELETE",
        path: `/v2/nfce/${encodeURIComponent(ref)}`,
        body: { justificativa: justificativa.trim() },
        fetchImpl,
    })
}

export function buildFocusAuthHeaderForTest(token: string): string {
    return basicAuthHeader(token)
}

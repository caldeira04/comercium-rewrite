import { describe, expect, it } from "vitest"
import { getApiErrorMessage, getResponseErrorMessage, throwApiError } from "@/lib/api-error"

describe("getApiErrorMessage", () => {
    it("extracts nested error message", () => {
        const error = { error: "NOT_FOUND", message: "loja não encontrada" }
        expect(getApiErrorMessage(error, "fallback")).toBe("loja não encontrada")
    })

    it("falls back for empty messages", () => {
        expect(getApiErrorMessage({ message: "" }, "fallback")).toBe("fallback")
    })

    it("uses useful Error messages", () => {
        expect(getApiErrorMessage(new Error("tempo esgotado"))).toBe("tempo esgotado")
    })

    it("uses string errors", () => {
        expect(getApiErrorMessage("venda bloqueada")).toBe("venda bloqueada")
    })

    it("returns default fallback for unknown values", () => {
        expect(getApiErrorMessage(42)).toBe("Erro ao processar solicitação")
    })

    it("handles circular objects without infinite recursion", () => {
        const circular: Record<string, unknown> = {}
        circular.self = circular

        expect(getApiErrorMessage(circular, "fallback")).toBe("fallback")
    })
})

describe("throwApiError", () => {
    it("throws an Error with the extracted message", () => {
        expect(() => throwApiError({ message: "dados inválidos" })).toThrowError("dados inválidos")
    })
})

describe("getResponseErrorMessage", () => {
    it("parses json response body", async () => {
        const response = new Response(JSON.stringify({ message: "usuário não encontrado" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })

        await expect(getResponseErrorMessage(response)).resolves.toBe("usuário não encontrado")
    })

    it("uses error field when message is absent", async () => {
        const response = new Response(JSON.stringify({ error: "FORBIDDEN" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        })

        await expect(getResponseErrorMessage(response)).resolves.toBe("FORBIDDEN")
    })

    it("falls back for non-json bodies", async () => {
        const response = new Response("not json", { status: 500 })

        await expect(getResponseErrorMessage(response, "fallback")).resolves.toBe("fallback")
    })
})
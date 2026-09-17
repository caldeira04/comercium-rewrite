import { describe, expect, test } from "bun:test"
import { buildFocusAuthHeaderForTest, cancelNfceRequest } from "./focus-client"

describe("focus-client", () => {
    test("header Basic usa token com dois pontos vazios", () => {
        const header = buildFocusAuthHeaderForTest("SEU_TOKEN")
        expect(header).toBe(`Basic ${Buffer.from("SEU_TOKEN:").toString("base64")}`)
    })

    test("cancelamento exige justificativa entre 15 e 255 caracteres", () => {
        expect(() => cancelNfceRequest("ref123", "curta")).toThrow()
        expect(() => cancelNfceRequest("ref123", "x".repeat(256))).toThrow()
    })
})

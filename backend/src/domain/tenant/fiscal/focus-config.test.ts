import { describe, expect, test } from "bun:test"
import { getFocusConfig } from "./focus-config"

describe("getFocusConfig", () => {
    test("desconfigurado sem token", () => {
        const config = getFocusConfig({} as NodeJS.ProcessEnv)
        expect(config.configured).toBe(false)
        expect(config.token).toBeNull()
        expect(config.environment).toBe("homologacao")
        expect(config.baseUrl).toBe("https://homologacao.focusnfe.com.br")
    })

    test("homologacao por padrão com token", () => {
        const config = getFocusConfig({ FOCUS_NFE_TOKEN: "abc123" } as NodeJS.ProcessEnv)
        expect(config.configured).toBe(true)
        expect(config.baseUrl).toBe("https://homologacao.focusnfe.com.br")
    })

    test("producao troca base url", () => {
        const config = getFocusConfig({ FOCUS_NFE_TOKEN: "abc", FOCUS_NFE_ENV: "producao" } as NodeJS.ProcessEnv)
        expect(config.environment).toBe("producao")
        expect(config.baseUrl).toBe("https://api.focusnfe.com.br")
    })

    test("base url customizada tem prioridade", () => {
        const config = getFocusConfig({
            FOCUS_NFE_TOKEN: "abc",
            FOCUS_NFE_BASE_URL: "https://custom.example.com/",
        } as NodeJS.ProcessEnv)
        expect(config.baseUrl).toBe("https://custom.example.com")
    })
})

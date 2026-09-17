export type FocusEnvironment = "homologacao" | "producao"

export type FocusConfig = {
    configured: boolean
    environment: FocusEnvironment
    baseUrl: string
    token: string | null
}

const HOMOLOGACAO_BASE_URL = "https://homologacao.focusnfe.com.br"
const PRODUCAO_BASE_URL = "https://api.focusnfe.com.br"

export function getFocusConfig(env: NodeJS.ProcessEnv = process.env): FocusConfig {
    const rawToken = (env.FOCUS_NFE_TOKEN ?? "").trim()
    const rawEnv = (env.FOCUS_NFE_ENV ?? "homologacao").trim().toLowerCase()
    const rawBaseUrl = (env.FOCUS_NFE_BASE_URL ?? "").trim()

    const environment: FocusEnvironment = rawEnv === "producao" ? "producao" : "homologacao"
    const defaultBaseUrl = environment === "producao" ? PRODUCAO_BASE_URL : HOMOLOGACAO_BASE_URL

    const token = rawToken.length > 0 ? rawToken : null

    return {
        configured: token !== null,
        environment,
        baseUrl: rawBaseUrl.length > 0 ? rawBaseUrl.replace(/\/$/, "") : defaultBaseUrl,
        token,
    }
}

export function isFocusConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    return getFocusConfig(env).configured
}

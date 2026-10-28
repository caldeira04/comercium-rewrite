// Compara modelos do OpenRouter no agente do assistente. Roda um conjunto fixo
// de perguntas numa cópia temporária de um tenant e confere as respostas com
// o resultado das próprias ferramentas.
//
// Uso: bun scripts/compare-agent-models.ts [--tenant fullbeer] [--repeat 1] modelo1 modelo2 ...

import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { parseArgs } from "node:util"
import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import type { ChatCompletionRequest, ChatCompletionResult, ChatToolCall } from "../src/domain/assistant/AssistantService"

const { values: options, positionals: models } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        tenant: { type: "string", default: "fullbeer" },
        repeat: { type: "string", default: "1" },
        out: { type: "string" },
    },
    allowPositionals: true,
})

if (models.length === 0) {
    console.error("Uso: bun scripts/compare-agent-models.ts [--tenant fullbeer] [--repeat 1] [--out resultado.json] modelo1 modelo2 ...")
    process.exit(1)
}

const apiKey = process.env.OPENROUTER_API_KEY?.trim()
if (!apiKey) {
    console.error("OPENROUTER_API_KEY não definida (backend/.env)")
    process.exit(1)
}

const TENANT = options.tenant!
const REPEAT = Math.max(1, Number(options.repeat) || 1)
const TIME_ZONE = "America/Sao_Paulo"
const USER_ID = "comparador-de-modelos"

// Copia os bancos para um diretório temporário antes de importar os módulos,
// que resolvem o caminho dos bancos na importação
const sourceDataDir = path.resolve(process.env.COMERCIUM_DATA_DIR ?? path.join(process.cwd(), "data"))
const dataDir = mkdtempSync(path.join(tmpdir(), "comercium-compare-"))
mkdirSync(path.join(dataDir, "tenants"), { recursive: true })
copyFileSync(path.join(sourceDataDir, "master.sqlite"), path.join(dataDir, "master.sqlite"))
copyFileSync(path.join(sourceDataDir, "tenants", `${TENANT}.sqlite`), path.join(dataDir, "tenants", `${TENANT}.sqlite`))
process.env.COMERCIUM_DATA_DIR = dataDir

const tenantSqlite = new Database(path.join(dataDir, "tenants", `${TENANT}.sqlite`))
migrate(drizzle(tenantSqlite), { migrationsFolder: path.resolve(import.meta.dir, "../drizzle/migrations/tenant") })
tenantSqlite.close()

const { runAssistantChat } = await import("../src/domain/assistant/AssistantAgent")
const { searchKnowledge } = await import("../src/domain/assistant/AssistantService")
const { getAssistantTool } = await import("../src/domain/assistant/tools")
const { todayInTimeZone } = await import("../src/utils/dates")

const today = todayInTimeZone(TIME_ZONE)
const [year, month] = today.split("-").map(Number)

function monthRange(offset: number) {
    const start = new Date(Date.UTC(year, month - 1 + offset, 1))
    const end = new Date(Date.UTC(year, month + offset, 0))
    const format = (date: Date) => date.toISOString().slice(0, 10)
    return { dataInicial: format(start), dataFinal: format(end) }
}

const currentMonth = monthRange(0)
const previousMonth = monthRange(-1)

async function tool(name: string, args: Record<string, unknown>) {
    return await getAssistantTool(name)!.run(args, {
        tenantSlug: TENANT,
        timeZone: TIME_ZONE,
        today,
        searchKnowledge: (query) => searchKnowledge(query),
    }) as any
}

function brl(value: number) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Ignora separador de milhar e espaços para aceitar "2.311,20" e "2311,20"
function normalize(text: string) {
    return text.toLowerCase().replace(/(\d)\.(?=\d{3})/g, "$1").replace(/\s+/g, " ")
}

function mentions(response: string, value: number) {
    return normalize(response).includes(normalize(brl(value)))
}

type Case = {
    id: string
    question: string
    // Ferramentas que precisam ser chamadas; null = nenhuma ferramenta de dados
    expectedTools: string[] | null
    check: (response: string) => { ok: boolean, detail: string }
}

async function buildCases(): Promise<Case[]> {
    const salesNow = await tool("resumo_vendas", currentMonth)
    const salesBefore = await tool("resumo_vendas", previousMonth)
    const receivedBefore = await tool("recebimentos", previousMonth)
    const topProducts = await tool("produtos_mais_vendidos", { ...currentMonth, limite: 5 })
    const cash = await tool("caixa_atual", {})

    const topProduct = topProducts.produtos[0]?.nome as string | undefined

    return [
        {
            id: "vendas-mes",
            question: "Quanto vendi esse mês?",
            expectedTools: ["resumo_vendas"],
            check: (response) => ({
                ok: mentions(response, salesNow.faturamento),
                detail: `esperado R$ ${brl(salesNow.faturamento)}`,
            }),
        },
        {
            id: "comparar-meses",
            question: "Compare minhas vendas do mês passado com as deste mês.",
            expectedTools: ["resumo_vendas"],
            check: (response) => ({
                ok: mentions(response, salesNow.faturamento) && mentions(response, salesBefore.faturamento),
                detail: `esperado R$ ${brl(salesBefore.faturamento)} e R$ ${brl(salesNow.faturamento)}`,
            }),
        },
        {
            id: "recebimentos",
            question: "Quanto recebi no mês passado? Separe por forma de pagamento.",
            expectedTools: ["recebimentos"],
            check: (response) => ({
                ok: mentions(response, receivedBefore.liquido) || mentions(response, receivedBefore.recebido),
                detail: `esperado R$ ${brl(receivedBefore.liquido)} líquido`,
            }),
        },
        {
            id: "mais-vendidos",
            question: "Quais foram os 5 produtos mais vendidos este mês?",
            expectedTools: ["produtos_mais_vendidos"],
            check: (response) => topProduct
                ? { ok: normalize(response).includes(topProduct.toLowerCase()), detail: `esperado "${topProduct}" no topo` }
                : { ok: true, detail: "sem vendas no mês" },
        },
        {
            id: "caixa",
            question: "O caixa está aberto? Qual o saldo esperado?",
            expectedTools: ["caixa_atual"],
            check: (response) => cash.caixa === null
                ? { ok: true, detail: "nenhum caixa aberto" }
                : { ok: mentions(response, cash.saldoEsperado), detail: `esperado R$ ${brl(cash.saldoEsperado)}` },
        },
        {
            id: "ajuda",
            question: "Como faço para abrir o caixa?",
            expectedTools: ["buscar_ajuda"],
            check: (response) => ({ ok: /caixa/i.test(response), detail: "resposta sobre abrir o caixa" }),
        },
        {
            id: "recusa-acao",
            question: "Lança uma conta de luz de R$ 300 para sexta-feira.",
            expectedTools: null,
            check: (response) => ({
                ok: /contas a pagar/i.test(response),
                detail: "deve recusar e indicar a tela Contas a Pagar",
            }),
        },
    ]
}

type Usage = { calls: number, promptTokens: number, completionTokens: number, cost: number }

function parseToolCalls(value: unknown): ChatToolCall[] {
    if (!Array.isArray(value)) return []

    return value.flatMap((call: any) => {
        if (typeof call?.id !== "string" || typeof call?.function?.name !== "string") return []
        const args = call.function.arguments
        return [{
            id: call.id,
            type: "function" as const,
            function: {
                name: call.function.name,
                arguments: typeof args === "string" ? args : JSON.stringify(args ?? {}),
            },
        }]
    })
}

function completeWith(model: string, usage: Usage) {
    return async (request: ChatCompletionRequest): Promise<ChatCompletionResult> => {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                messages: request.messages,
                usage: { include: true },
                ...(request.tools?.length ? { tools: request.tools, tool_choice: request.toolChoice ?? "auto" } : {}),
            }),
            signal: AbortSignal.timeout(120_000),
        })

        if (!response.ok) {
            throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 300)}`)
        }

        const body = await response.json() as any
        usage.calls += 1
        usage.promptTokens += body.usage?.prompt_tokens ?? 0
        usage.completionTokens += body.usage?.completion_tokens ?? 0
        usage.cost += body.usage?.cost ?? 0

        const message = body.choices?.[0]?.message
        if (!message) throw new Error(`resposta sem mensagem: ${JSON.stringify(body).slice(0, 300)}`)

        return {
            content: typeof message.content === "string" ? message.content : null,
            toolCalls: parseToolCalls(message.tool_calls),
        }
    }
}

type CaseResult = {
    model: string
    caseId: string
    run: number
    toolsOk: boolean
    answerOk: boolean
    toolsUsed: string[]
    detail: string
    response: string
    error?: string
    seconds: number
    usage: Usage
}

async function runCase(model: string, testCase: Case, run: number): Promise<CaseResult> {
    const usage: Usage = { calls: 0, promptTokens: 0, completionTokens: 0, cost: 0 }
    const started = performance.now()

    try {
        const result = await runAssistantChat({
            tenantSlug: TENANT,
            tenantName: TENANT,
            timeZone: TIME_ZONE,
            userId: USER_ID,
            message: testCase.question,
        }, completeWith(model, usage))

        const toolsUsed = result.toolsUsed.map((entry) => entry.name)
        const toolsOk = testCase.expectedTools === null
            ? toolsUsed.every((name) => name === "buscar_ajuda")
            : testCase.expectedTools.every((name) => toolsUsed.includes(name))
        const check = testCase.check(result.response)

        return {
            model, caseId: testCase.id, run, toolsOk, answerOk: check.ok, toolsUsed, detail: check.detail,
            response: result.response, seconds: (performance.now() - started) / 1000, usage,
        }
    } catch (error) {
        return {
            model, caseId: testCase.id, run, toolsOk: false, answerOk: false, toolsUsed: [], detail: "",
            response: "", error: error instanceof Error ? error.message : String(error),
            seconds: (performance.now() - started) / 1000, usage,
        }
    }
}

async function runModel(model: string, cases: Case[]) {
    const results: CaseResult[] = []

    for (let run = 1; run <= REPEAT; run++) {
        for (const testCase of cases) {
            const result = await runCase(model, testCase, run)
            results.push(result)
            const mark = result.error ? "ERRO" : result.toolsOk && result.answerOk ? "ok" : "falhou"
            console.error(`[${model}] ${testCase.id} #${run}: ${mark}${result.error ? ` (${result.error})` : ""}`)
        }
    }

    return results
}

try {
    const cases = await buildCases()
    console.error(`Hoje: ${today} | tenant: ${TENANT} | ${cases.length} perguntas x ${REPEAT} rodada(s) x ${models.length} modelo(s)\n`)

    const results = (await Promise.all(models.map((model) => runModel(model, cases)))).flat()

    console.log("\n## Resumo\n")
    console.log("| Modelo | Acertos | Ferramentas certas | Erros | Custo total (US$) | US$/pergunta | Tempo médio (s) |")
    console.log("|---|---|---|---|---|---|---|")
    for (const model of models) {
        const rows = results.filter((row) => row.model === model)
        const passed = rows.filter((row) => row.toolsOk && row.answerOk).length
        const toolsOk = rows.filter((row) => row.toolsOk).length
        const errors = rows.filter((row) => row.error).length
        const cost = rows.reduce((sum, row) => sum + row.usage.cost, 0)
        const seconds = rows.reduce((sum, row) => sum + row.seconds, 0) / rows.length
        console.log(`| \`${model}\` | ${passed}/${rows.length} | ${toolsOk}/${rows.length} | ${errors} | ${cost.toFixed(4)} | ${(cost / rows.length).toFixed(5)} | ${seconds.toFixed(1)} |`)
    }

    console.log("\n## Falhas\n")
    const failures = results.filter((row) => !(row.toolsOk && row.answerOk))
    if (failures.length === 0) console.log("Nenhuma.")
    for (const row of failures) {
        console.log(`- \`${row.model}\` · ${row.caseId} #${row.run}: ${row.error ?? `ferramentas [${row.toolsUsed.join(", ") || "nenhuma"}]${row.toolsOk ? "" : " (erradas)"}; ${row.answerOk ? "resposta ok" : row.detail}`}`)
    }

    if (options.out) {
        writeFileSync(options.out, JSON.stringify({ today, tenant: TENANT, cases: cases.map(({ id, question }) => ({ id, question })), results }, null, 2))
        console.error(`\nResultados completos em ${options.out}`)
    }
} finally {
    rmSync(dataDir, { recursive: true, force: true })
}

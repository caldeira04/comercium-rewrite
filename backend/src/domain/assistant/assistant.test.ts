import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import type { ChatCompletionRequest, ChatCompletionResult } from "./AssistantService"

// O banco é resolvido na importação de "@/db/db", então o diretório de dados
// temporário precisa existir antes de importar os módulos testados
const dataDir = mkdtempSync(path.join(tmpdir(), "comercium-assistant-"))
process.env.COMERCIUM_DATA_DIR = dataDir

const TENANT = "assistant_test"
const TIME_ZONE = "America/Sao_Paulo"
const USER_ID = "user-1"

type Modules = {
    tools: typeof import("./tools")
    agent: typeof import("./AssistantAgent")
}

let modules: Modules

function context() {
    return {
        tenantSlug: TENANT,
        timeZone: TIME_ZONE,
        today: "2026-10-27",
        searchKnowledge: async () => [{ title: "Vendas", sourceFile: "vendas.md", content: "Para cancelar uma venda..." }],
    }
}

async function runTool(name: string, args: Record<string, unknown>) {
    const tool = modules.tools.getAssistantTool(name)
    if (!tool) throw new Error(`tool ${name} not found`)
    return await tool.run(args, context()) as any
}

beforeAll(async () => {
    mkdirSync(path.join(dataDir, "tenants"), { recursive: true })
    const sqlite = new Database(path.join(dataDir, "tenants", `${TENANT}.sqlite`), { create: true })
    migrate(drizzle(sqlite), { migrationsFolder: path.resolve(import.meta.dir, "../../../drizzle/migrations/tenant") })

    // Horários em UTC; 2026-10-01 02:00 UTC ainda é 30/09 em São Paulo
    sqlite.exec(`
        -- O produto genérico (id 0) já vem da migração 0010
        INSERT INTO product (id, name, gtin, sell_price, buy_price) VALUES
            (1,'Cerveja Lata', '789001', 500, 300),
            (2, 'Refrigerante 2L', '789002', 1000, 600),
            (3, 'Vinho Tinto', '789003', 5000, 3000);

        INSERT INTO stock_movement (id, product_id, type, quantity, created_at) VALUES
            ('m1', 1, 'in', 100, '2026-09-01 12:00:00'),
            ('m2', 1, 'out', 12, '2026-10-10 15:00:00'),
            ('m3', 2, 'in', 10, '2026-09-01 12:00:00'),
            ('m4', 2, 'adjustment', 3, '2026-09-15 12:00:00'),
            ('m5', 3, 'in', 8, '2026-08-01 12:00:00');
        INSERT INTO stock_movement (id, product_id, type, quantity, created_at, deleted_at) VALUES
            ('m6', 3, 'in', 50, '2026-08-02 12:00:00', '2026-08-03 12:00:00');

        INSERT INTO client (id, name, phone) VALUES (1, 'Maria Souza', '11999990000'), (2, 'João Lima', NULL);

        INSERT INTO sale (id, total_amount, client_id, settled_at, cancelled_at) VALUES
            ('s1', 5000, 1, '2026-10-10 15:00:00', NULL),
            ('s2', 1000, NULL, '2026-10-11 15:00:00', NULL),
            ('s3', 9999, 1, '2026-10-12 15:00:00', '2026-10-12 16:00:00'),
            ('s4', 2000, 2, '2026-10-01 02:00:00', NULL);

        INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price, discount) VALUES
            ('i1', 's1', 1, 10, 500, 5000, NULL),
            ('i2', 's2', 1, 2, 500, 1000, NULL),
            ('i3', 's3', 3, 2, 5000, 9999, NULL),
            ('i4', 's4', 2, 2, 1000, 2000, 0);

        INSERT INTO payable (id, description, amount, due_date, paid_date) VALUES
            ('p1', 'Aluguel', 150000, '2026-10-05', '2026-10-05'),
            ('p2', 'Energia', 32000, '2026-10-20', NULL),
            ('p3', 'Internet', 12000, '2026-10-30', NULL);
    `)
    sqlite.close()

    modules = {
        tools: await import("./tools"),
        agent: await import("./AssistantAgent"),
    }
})

afterAll(() => {
    rmSync(dataDir, { recursive: true, force: true })
})

describe("assistant tools", () => {
    test("resumo_vendas ignora canceladas e usa o fuso da loja", async () => {
        const result = await runTool("resumo_vendas", { dataInicial: "2026-10-01", dataFinal: "2026-10-31", porDia: true })

        expect(result.quantidadeVendas).toBe(2)
        expect(result.faturamento).toBe(60)
        expect(result.ticketMedio).toBe(30)
        expect(result.porDia).toEqual([
            { data: "2026-10-10", quantidadeVendas: 1, faturamento: 50 },
            { data: "2026-10-11", quantidadeVendas: 1, faturamento: 10 },
        ])

        const september = await runTool("resumo_vendas", { dataInicial: "2026-09-30", dataFinal: "2026-09-30" })
        expect(september.faturamento).toBe(20)
    })

    test("resumo_vendas rejeita datas inválidas", async () => {
        await expect(runTool("resumo_vendas", { dataInicial: "ontem", dataFinal: "2026-10-31" })).rejects.toThrow("AAAA-MM-DD")
        await expect(runTool("resumo_vendas", { dataInicial: "2026-10-31", dataFinal: "2026-10-01" })).rejects.toThrow("posterior")
    })

    test("produtos_mais_vendidos agrega quantidade, faturamento e lucro", async () => {
        const result = await runTool("produtos_mais_vendidos", { dataInicial: "2026-10-01", dataFinal: "2026-10-31" })

        expect(result.produtos).toEqual([
            { id: 1, nome: "Cerveja Lata", quantidadeVendida: 12, faturamento: 60, lucroBrutoEstimado: 24 },
        ])
    })

    test("consultar_estoque aplica ajustes e ignora movimentações excluídas", async () => {
        const result = await runTool("consultar_estoque", {})
        const byName = Object.fromEntries(result.produtos.map((item: any) => [item.nome, item]))

        expect(byName["Cerveja Lata"].saldoEstoque).toBe(88)
        expect(byName["Refrigerante 2L"].saldoEstoque).toBe(3)
        expect(byName["Vinho Tinto"].saldoEstoque).toBe(8)
        expect(byName["Cerveja Lata"].margemPercentual).toBe(40)
        expect(byName["PRODUTO GENÉRICO"]).toBeUndefined()

        const low = await runTool("consultar_estoque", { estoqueMaximo: 5 })
        expect(low.produtos.map((item: any) => item.nome)).toEqual(["Refrigerante 2L"])

        const search = await runTool("consultar_estoque", { busca: "789003" })
        expect(search.produtos.map((item: any) => item.nome)).toEqual(["Vinho Tinto"])
    })

    test("produtos_parados lista itens com saldo e sem venda recente", async () => {
        const result = await runTool("produtos_parados", { dias: 3650 })

        expect(result.produtos.map((item: any) => item.nome)).toEqual(["Vinho Tinto"])
        expect(result.capitalParadoTotal).toBe(240)
        expect(result.produtos[0].ultimaVenda).toBeNull()
    })

    test("contas_a_pagar resume por situação em reais", async () => {
        const result = await runTool("contas_a_pagar", { dataInicial: "2026-10-01", dataFinal: "2026-10-31" })

        expect(result.totaisDoPeriodo.pagas).toEqual({ quantidade: 1, valor: 1500 })
        expect(result.totaisDoPeriodo.pendentes.valor + result.totaisDoPeriodo.vencidas.valor).toBe(440)
        expect(result.contas).toHaveLength(3)
    })

    test("buscar_clientes ordena por total gasto e ignora vendas canceladas", async () => {
        const result = await runTool("buscar_clientes", {})

        expect(result.clientes[0]).toMatchObject({ nome: "Maria Souza", compras: 1, totalGasto: 50, ultimaCompra: "2026-10-10" })
        expect(result.clientes[1]).toMatchObject({ nome: "João Lima", compras: 1, totalGasto: 20, ultimaCompra: "2026-09-30" })

        const search = await runTool("buscar_clientes", { busca: "9999" })
        expect(search.clientes.map((item: any) => item.nome)).toEqual(["Maria Souza"])
    })

    test("caixa_atual informa quando não há caixa", async () => {
        expect(await runTool("caixa_atual", {})).toMatchObject({ caixa: null })
    })
})

describe("assistant agent", () => {
    function scriptedModel(steps: ChatCompletionResult[]) {
        const requests: ChatCompletionRequest[] = []
        const complete = async (request: ChatCompletionRequest) => {
            requests.push(structuredClone(request))
            const step = steps.shift()
            if (!step) throw new Error("unexpected model call")
            return step
        }

        return { complete, requests }
    }

    const chatInput = {
        tenantSlug: TENANT,
        tenantName: "Loja Teste",
        timeZone: TIME_ZONE,
        userId: USER_ID,
    }

    test("executa ferramentas, salva a conversa e reaproveita o histórico", async () => {
        const first = scriptedModel([
            {
                content: null,
                toolCalls: [{
                    id: "call_1",
                    type: "function",
                    function: { name: "resumo_vendas", arguments: JSON.stringify({ dataInicial: "2026-10-01", dataFinal: "2026-10-31" }) },
                }],
            },
            { content: "Você faturou R$ 60,00 em outubro.", toolCalls: [] },
        ])

        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "Quanto vendi em outubro?" }, first.complete)

        expect(answer.response).toBe("Você faturou R$ 60,00 em outubro.")
        expect(answer.toolsUsed).toEqual([{ name: "resumo_vendas", label: "Vendas" }])

        const toolMessage = first.requests[1].messages.at(-1)
        expect(toolMessage).toMatchObject({ role: "tool", tool_call_id: "call_1" })
        expect(JSON.parse((toolMessage as { content: string }).content).faturamento).toBe(60)
        expect(first.requests[0].messages[0].content).toContain("Hoje é 2026-10-27")

        const second = scriptedModel([{ content: "Foram 2 vendas.", toolCalls: [] }])
        await modules.agent.runAssistantChat({ ...chatInput, message: "E quantas vendas?", conversationId: answer.conversationId }, second.complete)

        // system + pergunta, chamada, resultado, resposta anteriores + nova pergunta
        expect(second.requests[0].messages.map((message) => message.role)).toEqual(["system", "user", "assistant", "tool", "assistant", "user"])

        const conversation = await modules.agent.getAssistantConversation(TENANT, answer.conversationId, USER_ID)
        expect(conversation.title).toBe("Quanto vendi em outubro?")
        expect(conversation.messages).toEqual([
            { role: "user", content: "Quanto vendi em outubro?", toolsUsed: [] },
            { role: "assistant", content: "Você faturou R$ 60,00 em outubro.", toolsUsed: [{ name: "resumo_vendas", label: "Vendas" }] },
            { role: "user", content: "E quantas vendas?", toolsUsed: [] },
            { role: "assistant", content: "Foram 2 vendas.", toolsUsed: [] },
        ])
    })

    test("devolve erros de ferramenta ao modelo em vez de falhar", async () => {
        const model = scriptedModel([
            {
                content: null,
                toolCalls: [
                    { id: "bad_date", type: "function", function: { name: "resumo_vendas", arguments: "{\"dataInicial\":\"ontem\",\"dataFinal\":\"2026-10-31\"}" } },
                    { id: "unknown", type: "function", function: { name: "apagar_tudo", arguments: "{}" } },
                    { id: "bad_json", type: "function", function: { name: "caixa_atual", arguments: "{" } },
                ],
            },
            { content: "Não consegui consultar.", toolCalls: [] },
        ])

        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "teste de erros" }, model.complete)
        const toolResults = model.requests[1].messages
            .filter((message) => message.role === "tool")
            .map((message) => JSON.parse(message.content).erro)

        expect(answer.response).toBe("Não consegui consultar.")
        expect(toolResults[0]).toContain("AAAA-MM-DD")
        expect(toolResults[1]).toContain("ferramenta desconhecida")
        expect(toolResults[2]).toContain("JSON")
    })

    test("força resposta em texto após o limite de rodadas", async () => {
        const loopingCall: ChatCompletionResult = {
            content: null,
            toolCalls: [{ id: "c", type: "function", function: { name: "caixa_atual", arguments: "{}" } }],
        }
        const model = scriptedModel([
            ...Array.from({ length: 6 }, () => structuredClone(loopingCall)),
            { content: "Resposta final.", toolCalls: [] },
        ])

        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "loop" }, model.complete)

        expect(answer.response).toBe("Resposta final.")
        expect(model.requests).toHaveLength(7)
        expect(model.requests.at(-1)?.toolChoice).toBe("none")
    })

    test("isola conversas por usuário", async () => {
        const model = scriptedModel([{ content: "Oi!", toolCalls: [] }])
        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "oi" }, model.complete)

        await expect(modules.agent.getAssistantConversation(TENANT, answer.conversationId, "other-user")).rejects.toThrow("conversa não encontrada")
        expect((await modules.agent.listAssistantConversations(TENANT, "other-user"))).toEqual([])

        await modules.agent.deleteAssistantConversation(TENANT, answer.conversationId, USER_ID)
        const remaining = await modules.agent.listAssistantConversations(TENANT, USER_ID)
        expect(remaining.map((conversation) => conversation.id)).not.toContain(answer.conversationId)
    })
})

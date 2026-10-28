import { afterAll, beforeAll, describe, expect, setSystemTime, test } from "bun:test"
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
    // Datas relativas ("hoje", "esse mês") ficam fixas em 27/10/2026, meio-dia em São Paulo
    setSystemTime(new Date("2026-10-27T15:00:00Z"))
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

        INSERT INTO payee (id, name) VALUES ('pe1', 'Enel'), ('pe2', 'Energisa');
        INSERT INTO bank_account (id, name) VALUES ('ba1', 'Itaú');
        INSERT INTO category (id, name) VALUES (10, 'Bebidas');
    `)
    sqlite.close()

    modules = {
        tools: await import("./tools"),
        agent: await import("./AssistantAgent"),
    }
})

afterAll(() => {
    setSystemTime()
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

    test("sugestao_recompra calcula cobertura pela média de venda", async () => {
        const result = await runTool("sugestao_recompra", { diasCobertura: 90 })

        expect(result.periodoDaMedia).toEqual({ dataInicial: "2026-09-28", dataFinal: "2026-10-27" })
        expect(result.produtos).toEqual([
            { id: 2, nome: "Refrigerante 2L", saldoEstoque: 3, vendaMediaDiaria: 0.07, diasAteAcabar: 45, sugestaoCompra: 3, custoEstimado: 18 },
        ])

        expect((await runTool("sugestao_recompra", {})).produtos).toEqual([])
    })

    test("clientes_inativos lista quem não compra há N dias", async () => {
        const result = await runTool("clientes_inativos", { dias: 20 })

        expect(result.semComprarDesde).toBe("2026-10-07")
        expect(result.clientes).toEqual([
            { id: 2, nome: "João Lima", telefone: null, email: null, compras: 1, totalGasto: 20, ultimaCompra: "2026-09-30", diasSemComprar: 27 },
        ])
    })

    test("rentabilidade_produtos calcula lucro, margem e retorno sobre estoque", async () => {
        const result = await runTool("rentabilidade_produtos", { dataInicial: "2026-10-01", dataFinal: "2026-10-31" })

        expect(result.lucroBrutoTotal).toBe(24)
        expect(result.produtos).toEqual([{
            id: 1,
            nome: "Cerveja Lata",
            quantidadeVendida: 12,
            faturamento: 60,
            lucroBruto: 24,
            margemPercentual: 40,
            saldoEstoque: 88,
            capitalEmEstoque: 264,
            retornoSobreEstoquePercentual: 9.1,
        }])
    })

    test("gerar_relatorio devolve o anexo de download com os filtros", async () => {
        const payables = await runTool("gerar_relatorio", { tipo: "contas_a_pagar", dataInicial: "2026-10-01", dataFinal: "2026-10-31", situacao: "pagas" })

        expect(payables.quantidadeRegistros).toBe(1)
        expect(payables.arquivo).toEqual({
            kind: "payables_pdf",
            title: "Contas a pagar pagos de 2026-10-01 a 2026-10-31",
            filters: { startDate: "2026-10-01", endDate: "2026-10-31", status: "paid" },
            labels: { status: "pagos" },
        })

        const byPayee = await runTool("gerar_relatorio", { tipo: "contas_a_pagar", dataInicial: "2026-10-01", dataFinal: "2026-10-31", favorecido: "enel" })
        expect(byPayee.arquivo.filters.payeeId).toBe("pe1")

        const receivables = await runTool("gerar_relatorio", { tipo: "contas_a_receber", dataInicial: "2026-10-01", dataFinal: "2026-10-31" })
        expect(receivables.arquivo).toMatchObject({ kind: "receivables_pdf", filters: { status: "paid" } })

        await expect(runTool("gerar_relatorio", { tipo: "contas_a_pagar", dataInicial: "2026-10-01", dataFinal: "2026-10-31", favorecido: "Light" }))
            .rejects.toThrow("Não encontrei favorecido")
        await expect(runTool("gerar_relatorio", { tipo: "contas_a_pagar", dataInicial: "2026-10-01", dataFinal: "2026-10-31", situacao: "estornados" }))
            .rejects.toThrow("situacao")
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
            { role: "user", content: "Quanto vendi em outubro?", toolsUsed: [], actions: [], downloads: [], attachments: [] },
            { role: "assistant", content: "Você faturou R$ 60,00 em outubro.", toolsUsed: [{ name: "resumo_vendas", label: "Vendas" }], actions: [], downloads: [], attachments: [] },
            { role: "user", content: "E quantas vendas?", toolsUsed: [], actions: [], downloads: [], attachments: [] },
            { role: "assistant", content: "Foram 2 vendas.", toolsUsed: [], actions: [], downloads: [], attachments: [] },
        ])
    })

    test("devolve o relatório como download e o mantém na conversa", async () => {
        const model = scriptedModel([
            {
                content: null,
                toolCalls: [{
                    id: "report",
                    type: "function",
                    function: { name: "gerar_relatorio", arguments: JSON.stringify({ tipo: "contas_a_pagar", dataInicial: "2026-10-01", dataFinal: "2026-10-31" }) },
                }],
            },
            { content: "Seu relatório está pronto.", toolCalls: [] },
        ])

        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "pdf das contas de outubro" }, model.complete)
        expect(answer.downloads).toHaveLength(1)
        expect(answer.downloads[0].kind).toBe("payables_pdf")

        const conversation = await modules.agent.getAssistantConversation(TENANT, answer.conversationId, USER_ID)
        expect(conversation.messages[1].downloads).toEqual(answer.downloads)
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

describe("assistant actions", () => {
    const chatInput = {
        tenantSlug: TENANT,
        tenantName: "Loja Teste",
        timeZone: TIME_ZONE,
        userId: USER_ID,
    }

    function tenantSqlite() {
        return new Database(path.join(dataDir, "tenants", `${TENANT}.sqlite`))
    }

    function queryOne<T>(query: string, ...params: (string | number)[]) {
        const sqlite = tenantSqlite()
        try {
            return sqlite.query(query).get(...params) as T | null
        } finally {
            sqlite.close()
        }
    }

    // Modelo falso que chama uma ação e depois responde em texto
    function proposeWith(name: string, args: Record<string, unknown>, extraCalls: { name: string, args: Record<string, unknown> }[] = []) {
        const requests: ChatCompletionRequest[] = []
        const steps: ChatCompletionResult[] = [
            {
                content: null,
                toolCalls: [{ name, args }, ...extraCalls].map((call, index) => ({
                    id: `action_${index}`,
                    type: "function" as const,
                    function: { name: call.name, arguments: JSON.stringify(call.args) },
                })),
            },
            { content: "Preparei a ação; confira e confirme no cartão.", toolCalls: [] },
        ]
        const complete = async (request: ChatCompletionRequest) => {
            requests.push(structuredClone(request))
            const step = steps.shift()
            if (!step) throw new Error("unexpected model call")
            return step
        }

        return { complete, requests }
    }

    function decision(actionId: string, userId = USER_ID) {
        return { tenantSlug: TENANT, timeZone: TIME_ZONE, userId, actionId }
    }

    test("propõe conta a pagar sem gravar e executa com os valores editados", async () => {
        const model = proposeWith("lancar_conta_a_pagar", {
            descricao: "Conta de luz",
            valor: 320.5,
            vencimento: "2026-11-10",
            favorecido: "enel",
            categoria: "energia",
        })

        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "lança a conta de luz" }, model.complete)

        expect(model.requests[1].toolChoice).toBe("none")
        const toolContent = JSON.parse(model.requests[1].messages.at(-1)!.content as string)
        expect(toolContent.status).toBe("aguardando_confirmacao")
        expect(toolContent.valores).toMatchObject({ Valor: "R$ 320,50", Favorecido: "Enel", Categoria: "energia" })

        expect(answer.actions).toHaveLength(1)
        const [action] = answer.actions
        expect(action).toMatchObject({ type: "lancar_conta_a_pagar", status: "proposed", warnings: [] })
        expect(action.values).toMatchObject({ amount: 32050, dueDate: "2026-11-10", payeeId: "pe1", categoryId: "expense-category-energia" })
        expect(queryOne("SELECT id FROM payable WHERE description = 'Conta de luz'")).toBeNull()

        const confirmed = await modules.agent.confirmAssistantAction({
            ...decision(action.id),
            values: { amount: 33000, dueDate: "2026-11-12" },
        })

        expect(confirmed.status).toBe("executed")
        expect(confirmed.result?.referenceType).toBe("payable")
        expect(queryOne<{ amount: number, due_date: string, payee_id: string, created_by_user_id: string }>(
            "SELECT amount, due_date, payee_id, created_by_user_id FROM payable WHERE description = 'Conta de luz'",
        )).toEqual({ amount: 33000, due_date: "2026-11-12", payee_id: "pe1", created_by_user_id: USER_ID })

        await expect(modules.agent.confirmAssistantAction(decision(action.id))).rejects.toThrow("já foi decidida")

        const conversation = await modules.agent.getAssistantConversation(TENANT, answer.conversationId, USER_ID, TIME_ZONE)
        expect(conversation.messages[1].actions.map((item) => item.status)).toEqual(["executed"])

        const toolMessage = queryOne<{ content: string }>("SELECT content FROM assistant_message WHERE id = (SELECT message_id FROM assistant_action WHERE id = ?)", action.id)
        expect(JSON.parse(toolMessage!.content).status).toContain("confirmada")
    })

    test("devolve ao modelo nomes ambíguos e avisa sobre nomes não encontrados", async () => {
        const ambiguous = proposeWith("lancar_conta_a_pagar", { descricao: "Luz", valor: 100, vencimento: "2026-11-10", favorecido: "Ene" })
        const first = await modules.agent.runAssistantChat({ ...chatInput, message: "lança luz" }, ambiguous.complete)

        expect(first.actions).toEqual([])
        expect(JSON.parse(ambiguous.requests[1].messages.at(-1)!.content as string).erro).toContain("mais de uma opção de favorecido")

        const missing = proposeWith("lancar_conta_a_pagar", { descricao: "Luz", valor: 100, vencimento: "2026-11-10", favorecido: "Light" })
        const second = await modules.agent.runAssistantChat({ ...chatInput, message: "lança luz" }, missing.complete)

        // Favorecido inexistente é oferecido para criar junto com a conta
        const [offered] = second.actions
        expect(offered.values).toMatchObject({ payeeId: null, newPayeeName: "Light" })
        expect(offered.fields.map((field) => field.key)).toContain("newPayeeName")
        expect(offered.warnings[0]).toContain("será criado ao confirmar")

        await modules.agent.confirmAssistantAction(decision(offered.id))
        const created = queryOne<{ payee: string }>(
            "SELECT payee.name AS payee FROM payable JOIN payee ON payee.id = payable.payee_id WHERE payable.description = 'Luz'",
        )
        expect(created?.payee).toBe("Light")
    })

    test("valores inválidos mantêm o cartão pendente; recusar encerra a ação", async () => {
        const model = proposeWith("cadastrar_cliente", { nome: "Ana Paula", telefone: "11988887777" })
        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "cadastra a Ana" }, model.complete)
        const [action] = answer.actions

        await expect(modules.agent.confirmAssistantAction({ ...decision(action.id), values: { name: "" } })).rejects.toThrow("informe nome")
        await expect(modules.agent.confirmAssistantAction({ ...decision(action.id), values: { email: "sem-arroba" } })).rejects.toThrow("e-mail inválido")
        expect(queryOne<{ status: string }>("SELECT status FROM assistant_action WHERE id = ?", action.id)?.status).toBe("proposed")

        await expect(modules.agent.confirmAssistantAction(decision(action.id, "other-user"))).rejects.toThrow("conversa não encontrada")

        const rejected = await modules.agent.rejectAssistantAction(decision(action.id))
        expect(rejected.status).toBe("rejected")
        expect(queryOne("SELECT id FROM client WHERE name = 'Ana Paula'")).toBeNull()
        await expect(modules.agent.confirmAssistantAction(decision(action.id))).rejects.toThrow("já foi decidida")
    })

    test("dá baixa em conta pendente pelo id", async () => {
        const model = proposeWith("baixar_conta_a_pagar", { contaId: "p2", contaBancaria: "itau", formaPagamento: "pix" })
        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "paguei a energia" }, model.complete)
        const [action] = answer.actions

        expect(action.values).toMatchObject({ payableId: "p2", amount: 32000, bankAccountId: "ba1", paymentMethod: "pix" })

        // Campos só de leitura não podem ser alterados pelo cartão
        const confirmed = await modules.agent.confirmAssistantAction({ ...decision(action.id), values: { amount: 1, payableId: "p3" } })
        expect(confirmed.status).toBe("executed")

        const paid = queryOne<{ paid_date: string, payment_method: string }>("SELECT paid_date, payment_method FROM payable WHERE id = 'p2'")
        expect(paid?.paid_date).toBe(action.values.paidDate as string)
        expect(paid?.payment_method).toBe("pix")
        expect(queryOne<{ paid_date: string | null }>("SELECT paid_date FROM payable WHERE id = 'p3'")?.paid_date).toBeNull()

        const again = proposeWith("baixar_conta_a_pagar", { contaId: "p2" })
        await modules.agent.runAssistantChat({ ...chatInput, message: "paguei a energia" }, again.complete)
        expect(JSON.parse(again.requests[1].messages.at(-1)!.content as string).erro).toContain("já está paga")
    })

    test("cadastra produto em centavos e recusa código de barras repetido", async () => {
        const duplicated = proposeWith("cadastrar_produto", { nome: "Outra Cerveja", precoVenda: 6, codigoBarras: "789001" })
        await modules.agent.runAssistantChat({ ...chatInput, message: "cadastra" }, duplicated.complete)
        expect(JSON.parse(duplicated.requests[1].messages.at(-1)!.content as string).erro).toContain("código de barras")

        const model = proposeWith("cadastrar_produto", { nome: "Água 500ml", precoVenda: 3.5, precoCusto: 1.2, categoria: "bebidas" })
        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "cadastra água" }, model.complete)
        await modules.agent.confirmAssistantAction(decision(answer.actions[0].id))

        expect(queryOne<Record<string, number>>("SELECT sell_price, buy_price, category_id FROM product WHERE name = 'Água 500ml'"))
            .toEqual({ sell_price: 350, buy_price: 120, category_id: 10 })
    })

    test("aceita uma ação por vez e expira cartões pendentes", async () => {
        const model = proposeWith(
            "cadastrar_cliente", { nome: "Carlos" },
            [{ name: "cadastrar_cliente", args: { nome: "Beatriz" } }],
        )
        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: "cadastra Carlos e Beatriz" }, model.complete)

        expect(answer.actions).toHaveLength(1)
        const toolResults = model.requests[1].messages.filter((message) => message.role === "tool")
        expect(JSON.parse(toolResults[1].content).erro).toContain("uma ação por vez")

        // Uma nova mensagem na conversa expira o cartão pendente
        const followUp = proposeWith("cadastrar_cliente", { nome: "Beatriz" })
        const next = await modules.agent.runAssistantChat({ ...chatInput, message: "agora a Beatriz", conversationId: answer.conversationId }, followUp.complete)
        await expect(modules.agent.confirmAssistantAction(decision(answer.actions[0].id))).rejects.toThrow("já foi decidida")

        // Cartões vencidos não podem mais ser confirmados
        const sqlite = tenantSqlite()
        sqlite.query("UPDATE assistant_action SET expires_at = '2000-01-01T00:00:00.000Z' WHERE id = ?").run(next.actions[0].id)
        sqlite.close()

        await expect(modules.agent.confirmAssistantAction(decision(next.actions[0].id))).rejects.toThrow("expirou")
        expect(queryOne<{ status: string }>("SELECT status FROM assistant_action WHERE id = ?", next.actions[0].id)?.status).toBe("expired")
    })
})

describe("assistant actions (etapa 2)", () => {
    const chatInput = {
        tenantSlug: TENANT,
        tenantName: "Loja Teste",
        timeZone: TIME_ZONE,
        userId: USER_ID,
    }

    function tenantSqlite() {
        return new Database(path.join(dataDir, "tenants", `${TENANT}.sqlite`))
    }

    // Linhas cruas do SQLite, comparadas nos testes com toEqual
    function queryOne(query: string, ...params: (string | number)[]): any {
        const sqlite = tenantSqlite()
        try {
            return sqlite.query(query).get(...params)
        } finally {
            sqlite.close()
        }
    }

    // Propõe a ação e devolve o cartão, ou o erro devolvido ao modelo
    async function propose(name: string, args: Record<string, unknown>) {
        const steps: ChatCompletionResult[] = [
            { content: null, toolCalls: [{ id: "a", type: "function", function: { name, arguments: JSON.stringify(args) } }] },
            { content: "Confira o cartão.", toolCalls: [] },
        ]
        const requests: ChatCompletionRequest[] = []
        const answer = await modules.agent.runAssistantChat({ ...chatInput, message: name }, async (request) => {
            requests.push(structuredClone(request))
            return steps.shift()!
        })
        const toolResult = JSON.parse(requests[1].messages.at(-1)!.content as string)

        return { action: answer.actions[0], error: toolResult.erro as string | undefined }
    }

    function confirm(actionId: string, values?: Record<string, unknown>) {
        return modules.agent.confirmAssistantAction({ tenantSlug: TENANT, timeZone: TIME_ZONE, userId: USER_ID, actionId, values })
    }

    test("sangria exige caixa aberto e registra a movimentação", async () => {
        expect((await propose("sangria_suprimento", { tipo: "sangria", valor: 50 })).error).toContain("não há caixa aberto")

        const sqlite = tenantSqlite()
        sqlite.exec("INSERT INTO cash (id, opening_amount) VALUES ('cash1', 10000)")
        sqlite.close()

        const { action } = await propose("sangria_suprimento", { tipo: "sangria", valor: 500, descricao: "depósito" })
        expect(action.warnings[0]).toContain("maior que o saldo esperado")

        const confirmed = await confirm(action.id, { amount: 5000 })
        expect(confirmed.status).toBe("executed")
        expect(queryOne("SELECT nature, type, amount, description FROM cash_movement WHERE cash_id = 'cash1' AND type = 'drop'"))
            .toEqual({ nature: "out", type: "drop", amount: 5000, description: "depósito" })
    })

    test("entrada de estoque registra a movimentação e a conta a pagar", async () => {
        const { action } = await propose("entrada_estoque", { produto: "cerveja", quantidade: 24, valorTotal: 72, vencimento: "2026-11-15", favorecido: "enel" })

        expect(action.values).toMatchObject({ productId: 1, productName: "Cerveja Lata", quantity: 24, createPayable: true, amount: 7200, payeeId: "pe1" })
        expect(action.warnings).toEqual([])

        const confirmed = await confirm(action.id)
        const movement = queryOne("SELECT id, quantity, type FROM stock_movement WHERE id = ?", confirmed.result!.referenceId)
        expect(movement).toMatchObject({ quantity: 24, type: "in" })
        expect(queryOne("SELECT amount, due_date, origin FROM payable WHERE stock_movement_id = ?", movement!.id))
            .toEqual({ amount: 7200, due_date: "2026-11-15", origin: "stock_purchase" })

        // Sem valor, não lança conta, a menos que o usuário marque no cartão
        const withoutPayable = await propose("entrada_estoque", { produtoId: 3, quantidade: 2 })
        expect(withoutPayable.action.values.createPayable).toBe(false)
        expect((await propose("entrada_estoque", { produto: "picanha", quantidade: 1 })).error).toContain("não encontrei o produto")
    })

    test("alterar_produto mostra o antes e valida o código de barras", async () => {
        const { action } = await propose("alterar_produto", { produto: "789002", precoVenda: 11.5 })

        expect(action.previousValues).toMatchObject({ sellPrice: 1000 })
        expect(action.values).toMatchObject({ productId: 2, sellPrice: 1150, buyPrice: 600 })

        await expect(confirm(action.id, { gtin: "789001" })).rejects.toThrow("código de barras")
        await confirm(action.id)
        expect(queryOne("SELECT sell_price FROM product WHERE id = 2")).toEqual({ sell_price: 1150 })

        expect((await propose("alterar_produto", { produtoId: 2, precoVenda: 11.5 })).error).toContain("nenhuma alteração")
    })

    test("editar_cliente altera só o cliente pedido", async () => {
        const { action } = await propose("editar_cliente", { clienteId: 2, telefone: "11977776666" })
        expect(action.previousValues).toMatchObject({ phone: null })

        await confirm(action.id)
        expect(queryOne("SELECT name, phone FROM client WHERE id = 2")).toEqual({ name: "João Lima", phone: "11977776666" })

        expect((await propose("editar_cliente", { clienteId: 0, nome: "X" })).error).toContain("Consumidor Final")
    })

    test("estornar_baixa volta a conta para pendente", async () => {
        expect((await propose("estornar_baixa", { contaId: "p3" })).error).toContain("não está paga")

        const { action } = await propose("estornar_baixa", { contaId: "p1" })
        await confirm(action.id)
        expect(queryOne("SELECT paid_date FROM payable WHERE id = 'p1'")).toEqual({ paid_date: null })
    })

    test("cadastra favorecido e categoria de despesa sem duplicar", async () => {
        expect((await propose("cadastrar_categoria_despesa", { nome: "Energia" })).error).toContain("já existe")

        const category = await propose("cadastrar_categoria_despesa", { nome: "Marketing" })
        await confirm(category.action.id)
        expect(queryOne("SELECT name FROM expense_category WHERE name = 'Marketing'")).toEqual({ name: "Marketing" })

        const payee = await propose("cadastrar_favorecido", { nome: "Contador Silva", tipo: "outros" })
        await confirm(payee.action.id)
        expect(queryOne("SELECT kind FROM payee WHERE name = 'Contador Silva'")).toEqual({ kind: "other" })

        const duplicated = await propose("cadastrar_favorecido", { nome: "enel" })
        expect(duplicated.action.warnings[0]).toContain("Já existe")
    })

    test("altera preços em lote com percentual e terminação", async () => {
        expect((await propose("alterar_precos_em_lote", { percentual: 5 })).error).toContain("informe categoria")

        const { action } = await propose("alterar_precos_em_lote", { produtoIds: [1, 3], percentual: 10, terminacao: 90 })
        const rows = action.values.rows as any[]

        // Cerveja 5,00 → 5,50 → 5,90; Vinho 50,00 → 55,00 → 55,90
        expect(rows.map((row) => [row.name, row.currentPrice, row.newPrice])).toEqual([
            ["Cerveja Lata", 500, 590],
            ["Vinho Tinto", 5000, 5590],
        ])

        // Desmarca o vinho e corrige o preço da cerveja no cartão
        await expect(confirm(action.id, { rows: [{ include: false }, { include: false }] })).rejects.toThrow("marque pelo menos uma linha")
        await confirm(action.id, { rows: [{ newPrice: 600 }, { include: false }] })

        expect(queryOne("SELECT sell_price FROM product WHERE id = 1")).toEqual({ sell_price: 600 })
        expect(queryOne("SELECT sell_price FROM product WHERE id = 3")).toEqual({ sell_price: 5000 })
    })

    test("cadastra produtos colados em lote, desmarcando os já existentes", async () => {
        const { action } = await propose("cadastrar_produtos_em_lote", {
            produtos: [
                { nome: "Suco Uva 1L", precoVenda: 9.9, precoCusto: 5, categoria: "bebidas" },
                { nome: "cerveja lata", precoVenda: 5 },
                { nome: "Suco Laranja 1L", precoVenda: 9.9, codigoBarras: "789100" },
            ],
        })

        expect((action.values.rows as any[]).map((row) => row.include)).toEqual([true, false, true])
        expect(action.warnings[0]).toContain("linhas 2 (cerveja lata)")

        // Lote com erro numa linha não grava nada
        await expect(confirm(action.id, { rows: [{}, {}, { gtin: "789001" }] })).rejects.toThrow("linha 3: já existe um produto")
        expect(queryOne("SELECT id FROM product WHERE name = 'Suco Uva 1L'")).toBeNull()

        const confirmed = await confirm(action.id)
        expect(JSON.parse(confirmed.result!.referenceId)).toHaveLength(2)
        expect(queryOne("SELECT sell_price, buy_price, category_id FROM product WHERE name = 'Suco Uva 1L'"))
            .toEqual({ sell_price: 990, buy_price: 500, category_id: 10 })
    })

    test("lança várias contas numa transação", async () => {
        const { action } = await propose("lancar_contas_em_lote", {
            contas: [
                { descricao: "Aluguel", valor: 2500, vencimento: "2026-11-05", categoria: "aluguel" },
                { descricao: "Contador", valor: 450, vencimento: "2026-11-15", favorecido: "Contador Silva" },
            ],
        })

        expect((action.values.rows as any[])[1].payeeId).not.toBeNull()

        await expect(confirm(action.id, { rows: [{}, { dueDate: "" }] })).rejects.toThrow("linha 2: informe vencimento")
        expect(queryOne("SELECT id FROM payable WHERE description = 'Aluguel' AND due_date = '2026-11-05'")).toBeNull()

        await confirm(action.id)
        expect(queryOne("SELECT count(*) AS total FROM payable WHERE due_date IN ('2026-11-05', '2026-11-15') AND description IN ('Aluguel', 'Contador')"))
            .toEqual({ total: 2 })
    })
})

describe("assistant NF-e", () => {
    const ACCESS_KEY = "35261012345678000199550010000012341000012345"
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe><infNFe Id="NFe${ACCESS_KEY}" versao="4.00">
    <ide><nNF>1234</nNF><dhEmi>2026-10-20T10:00:00-03:00</dhEmi></ide>
    <emit><CNPJ>12345678000199</CNPJ><xNome>Distribuidora Bebidas LTDA</xNome><xFant>Distribuidora Sul</xFant></emit>
    <det nItem="1"><prod><cProd>A1</cProd><cEAN>789003</cEAN><xProd>VINHO TINTO 750ML</xProd><uCom>UN</uCom><qCom>6.0000</qCom><vUnCom>32.5000</vUnCom><vProd>195.00</vProd></prod></det>
    <det nItem="2"><prod><cProd>B2</cProd><cEAN>SEM GTIN</cEAN><xProd>Espumante Rose</xProd><uCom>CX</uCom><qCom>2.0000</qCom><vUnCom>40.0000</vUnCom><vProd>80.00</vProd><vDesc>5.00</vDesc></prod></det>
    <total><ICMSTot><vNF>270.00</vNF></ICMSTot></total>
    <cobr><dup><nDup>001</nDup><dVenc>2026-11-20</dVenc><vDup>135.00</vDup></dup><dup><nDup>002</nDup><dVenc>2026-12-20</dVenc><vDup>135.00</vDup></dup></cobr>
  </infNFe></NFe>
  <protNFe><infProt><chNFe>${ACCESS_KEY}</chNFe></infProt></protNFe>
</nfeProc>`

    function queryOne(query: string, ...params: (string | number)[]): any {
        const sqlite = new Database(path.join(dataDir, "tenants", `${TENANT}.sqlite`))
        try {
            return sqlite.query(query).get(...params)
        } finally {
            sqlite.close()
        }
    }

    async function importWith(attachmentId: string) {
        const steps: ChatCompletionResult[] = [
            { content: null, toolCalls: [{ id: "nfe", type: "function", function: { name: "importar_nfe", arguments: JSON.stringify({ anexoId: attachmentId }) } }] },
            { content: "Confira a nota.", toolCalls: [] },
        ]
        const requests: ChatCompletionRequest[] = []
        const answer = await modules.agent.runAssistantChat({
            tenantSlug: TENANT,
            tenantName: "Loja Teste",
            timeZone: TIME_ZONE,
            userId: USER_ID,
            message: "importa essa nota",
            attachmentId,
        }, async (request) => {
            requests.push(structuredClone(request))
            return steps.shift()!
        })

        return { answer, requests, error: JSON.parse(requests[1].messages.at(-1)!.content as string).erro as string | undefined }
    }

    test("lê a NF-e sem IA", async () => {
        const { parseNfe } = await import("./nfe")
        const nfe = parseNfe(xml)

        expect(nfe).toMatchObject({
            accessKey: ACCESS_KEY,
            number: "1234",
            issuedAt: "2026-10-20",
            supplier: { document: "12345678000199", name: "Distribuidora Sul" },
            total: 27000,
        })
        expect(nfe.items.map((item) => [item.ean, item.quantity, item.unitPrice, item.total])).toEqual([
            ["789003", 6, 3250, 19500],
            [null, 2, 4000, 7500],
        ])
        expect(nfe.installments).toEqual([
            { number: "001", dueDate: "2026-11-20", amount: 13500 },
            { number: "002", dueDate: "2026-12-20", amount: 13500 },
        ])

        expect(() => parseNfe("<nota/>")).toThrow("não parece uma NF-e")
    })

    test("importa a nota: produtos novos, favorecido, estoque e duplicatas", async () => {
        const { saveAssistantAttachment } = await import("./attachments")
        await expect(saveAssistantAttachment(TENANT, USER_ID, new File(["oi"], "foto.png", { type: "image/png" }))).rejects.toThrow("só aceito o XML")

        const attachment = await saveAssistantAttachment(TENANT, USER_ID, new File([xml], "nota-1234.xml", { type: "text/xml" }))
        const { answer, requests } = await importWith(attachment.id)

        // O modelo recebe o anexoId junto da mensagem
        expect(requests[0].messages.at(-1)!.content).toContain(`anexoId: ${attachment.id}`)

        const [action] = answer.actions
        const rows = action.values.rows as any[]
        expect(rows.map((row) => [row.description, row.productId, row.quantity, row.unitCost])).toEqual([
            ["VINHO TINTO 750ML", "3", 6, 3250],
            ["Espumante Rose", "__novo__", 2, 3750],
        ])
        expect(action.values).toMatchObject({ payeeId: null, newPayeeName: "Distribuidora Sul", total: 27000 })
        expect(action.warnings.join(" ")).toContain("Espumante Rose (2 CX)")

        // Produto novo precisa de preço de venda
        await expect(modules.agent.confirmAssistantAction({ tenantSlug: TENANT, timeZone: TIME_ZONE, userId: USER_ID, actionId: action.id }))
            .rejects.toThrow("linha 2: informe o preço de venda")

        const confirmed = await modules.agent.confirmAssistantAction({
            tenantSlug: TENANT,
            timeZone: TIME_ZONE,
            userId: USER_ID,
            actionId: action.id,
            values: { rows: [{}, { sellPrice: 6990, quantity: 12 }] },
        })
        expect(confirmed.status).toBe("executed")

        const payee = queryOne("SELECT id, document FROM payee WHERE name = 'Distribuidora Sul'")
        expect(payee.document).toBe("12345678000199")
        expect(queryOne("SELECT buy_price FROM product WHERE id = 3")).toEqual({ buy_price: 3250 })
        expect(queryOne("SELECT sell_price, buy_price FROM product WHERE name = 'Espumante Rose'")).toEqual({ sell_price: 6990, buy_price: 3750 })
        expect(queryOne("SELECT count(*) AS total, sum(quantity) AS quantity FROM stock_movement WHERE reason = 'NF-e 1234'"))
            .toEqual({ total: 2, quantity: 18 })
        expect(queryOne("SELECT count(*) AS total, sum(amount) AS amount FROM payable WHERE payee_id = ?", payee.id))
            .toEqual({ total: 2, amount: 27000 })

        // A conversa mostra o anexo e a mesma nota não entra duas vezes
        const conversation = await modules.agent.getAssistantConversation(TENANT, answer.conversationId, USER_ID)
        expect(conversation.messages[0].attachments).toEqual([{ id: attachment.id, fileName: "nota-1234.xml" }])

        const again = await saveAssistantAttachment(TENANT, USER_ID, new File([xml], "nota-1234.xml", { type: "text/xml" }))
        expect((await importWith(again.id)).error).toContain("já foi importada")

        // Excluir a conversa apaga o arquivo
        const filePath = path.join(dataDir, "attachments", TENANT, attachment.id)
        expect(await Bun.file(filePath).exists()).toBe(true)
        await modules.agent.deleteAssistantConversation(TENANT, answer.conversationId, USER_ID)
        expect(await Bun.file(filePath).exists()).toBe(false)
    })

    test("anexo de outro usuário ou já usado não serve", async () => {
        const { saveAssistantAttachment } = await import("./attachments")
        const attachment = await saveAssistantAttachment(TENANT, "other-user", new File([xml], "nota.xml", { type: "text/xml" }))

        await expect(modules.agent.runAssistantChat({
            tenantSlug: TENANT, tenantName: "Loja", timeZone: TIME_ZONE, userId: USER_ID, message: "importa", attachmentId: attachment.id,
        }, async () => ({ content: "ok", toolCalls: [] }))).rejects.toThrow("anexo não encontrado")
    })
})

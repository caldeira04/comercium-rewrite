import { and, asc, desc, eq, gte, isNotNull, isNull, lt, like, max, ne, sql } from "drizzle-orm"
import { getTenantDb } from "@/db/db"
import { client, product, sale, saleItem, stockMovement, category } from "@/db/schema/tenant"
import { getPayables, payableStatuses, type PayableStatus } from "../tenant/payables/PayablesService"
import { getReceivables } from "../tenant/receivables/ReceivablesService"
import { currentCash } from "../tenant/cash/CashService"
import { AppError } from "../../utils/errors"
import { isValidDateInput, localDateRangeToUtc, normalizeTimeZone } from "../../utils/dates"

const GENERIC_PRODUCT_ID = 0

export type AssistantToolContext = {
    tenantSlug: string
    timeZone: string
    today: string
    searchKnowledge: (query: string) => Promise<{ title: string, sourceFile: string, content: string }[]>
}

type JsonSchema = {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
    additionalProperties: false
}

export type AssistantTool = {
    name: string
    label: string
    description: string
    parameters: JsonSchema
    run: (args: Record<string, unknown>, context: AssistantToolContext) => Promise<unknown>
}

function reais(cents: number | null | undefined) {
    return Math.round(Number(cents ?? 0)) / 100
}

function dateArg(args: Record<string, unknown>, key: string) {
    const value = args[key]
    if (typeof value !== "string" || !isValidDateInput(value)) {
        throw new AppError(`${key} deve ser uma data no formato AAAA-MM-DD`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return value
}

function dateRangeArgs(args: Record<string, unknown>) {
    const startDate = dateArg(args, "dataInicial")
    const endDate = dateArg(args, "dataFinal")
    if (startDate > endDate) {
        throw new AppError("dataInicial não pode ser posterior a dataFinal", 400, "INVALID_TOOL_ARGUMENT")
    }

    return { startDate, endDate }
}

function intArg(args: Record<string, unknown>, key: string, fallback: number, min: number, maxValue: number) {
    const value = args[key]
    if (value === undefined || value === null) return fallback
    if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new AppError(`${key} deve ser um número inteiro`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return Math.min(Math.max(value, min), maxValue)
}

function optionalStringArg(args: Record<string, unknown>, key: string) {
    const value = args[key]
    if (value === undefined || value === null) return undefined
    if (typeof value !== "string") {
        throw new AppError(`${key} deve ser um texto`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return value.trim() || undefined
}

function enumArg<T extends string>(args: Record<string, unknown>, key: string, values: readonly T[], fallback: T): T {
    const value = args[key]
    if (value === undefined || value === null) return fallback
    if (typeof value !== "string" || !values.includes(value as T)) {
        throw new AppError(`${key} deve ser um destes valores: ${values.join(", ")}`, 400, "INVALID_TOOL_ARGUMENT")
    }

    return value as T
}

// Converte um timestamp UTC do SQLite ("AAAA-MM-DD HH:MM:SS") para a data local do tenant
export function utcToLocalDate(value: string, timeZone: string) {
    const instant = new Date(`${value.replace(" ", "T")}Z`)
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: normalizeTimeZone(timeZone),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(instant)
    const values = new Map(parts.map((part) => [part.type, part.value]))

    return `${values.get("year")}-${values.get("month")}-${values.get("day")}`
}

function settledSalesInRange(startUtc: string, endExclusiveUtc: string) {
    return and(
        gte(sale.settledAt, startUtc),
        lt(sale.settledAt, endExclusiveUtc),
        isNull(sale.cancelledAt),
        isNull(sale.deletedAt),
    )
}

// Mesma regra da tela de produtos: "adjustment" define o saldo absoluto
async function stockBalances(tenantSlug: string) {
    const db = getTenantDb(tenantSlug)
    const movements = await db
        .select({
            productId: stockMovement.productId,
            type: stockMovement.type,
            quantity: stockMovement.quantity,
        })
        .from(stockMovement)
        .where(isNull(stockMovement.deletedAt))
        .orderBy(asc(stockMovement.createdAt), asc(sql`rowid`))

    const balances = new Map<number, number>()
    for (const movement of movements) {
        const current = balances.get(movement.productId) ?? 0
        if (movement.type === "in") balances.set(movement.productId, current + movement.quantity)
        if (movement.type === "out") balances.set(movement.productId, current - movement.quantity)
        if (movement.type === "adjustment") balances.set(movement.productId, movement.quantity)
    }

    return balances
}

const dateRangeProperties = {
    dataInicial: { type: "string", description: "Data inicial (AAAA-MM-DD), inclusiva, no fuso da loja." },
    dataFinal: { type: "string", description: "Data final (AAAA-MM-DD), inclusiva, no fuso da loja." },
}

export const assistantTools: AssistantTool[] = [
    {
        name: "buscar_ajuda",
        label: "Guias de uso",
        description: "Busca nos guias de uso do Comercium. Use para dúvidas sobre como fazer algo no sistema (telas, fluxos, configurações).",
        parameters: {
            type: "object",
            properties: {
                pergunta: { type: "string", description: "A dúvida de uso, em linguagem natural." },
            },
            required: ["pergunta"],
            additionalProperties: false,
        },
        async run(args, context) {
            const query = optionalStringArg(args, "pergunta")
            if (!query) throw new AppError("pergunta é obrigatória", 400, "INVALID_TOOL_ARGUMENT")

            return { trechos: await context.searchKnowledge(query) }
        },
    },
    {
        name: "resumo_vendas",
        label: "Vendas",
        description: "Resumo das vendas finalizadas (não canceladas) em um período: faturamento, quantidade de vendas, ticket médio e, opcionalmente, a quebra por dia. Valores em reais.",
        parameters: {
            type: "object",
            properties: {
                ...dateRangeProperties,
                porDia: { type: "boolean", description: "Se verdadeiro, inclui faturamento e quantidade por dia." },
            },
            required: ["dataInicial", "dataFinal"],
            additionalProperties: false,
        },
        async run(args, context) {
            const { startDate, endDate } = dateRangeArgs(args)
            const { startUtc, endExclusiveUtc } = localDateRangeToUtc(startDate, endDate, context.timeZone)
            const db = getTenantDb(context.tenantSlug)

            const rows = await db
                .select({ settledAt: sale.settledAt, totalAmount: sale.totalAmount })
                .from(sale)
                .where(settledSalesInRange(startUtc, endExclusiveUtc))

            const total = rows.reduce((sum, row) => sum + row.totalAmount, 0)
            const result: Record<string, unknown> = {
                periodo: { dataInicial: startDate, dataFinal: endDate },
                quantidadeVendas: rows.length,
                faturamento: reais(total),
                ticketMedio: rows.length ? reais(total / rows.length) : 0,
            }

            if (args.porDia === true) {
                const byDay = new Map<string, { quantidade: number, total: number }>()
                for (const row of rows) {
                    const day = utcToLocalDate(row.settledAt!, context.timeZone)
                    const current = byDay.get(day) ?? { quantidade: 0, total: 0 }
                    byDay.set(day, { quantidade: current.quantidade + 1, total: current.total + row.totalAmount })
                }

                result.porDia = [...byDay.entries()]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([data, value]) => ({ data, quantidadeVendas: value.quantidade, faturamento: reais(value.total) }))
            }

            return result
        },
    },
    {
        name: "produtos_mais_vendidos",
        label: "Produtos vendidos",
        description: "Ranking de produtos vendidos em um período, por quantidade ou por faturamento. Inclui lucro bruto estimado pelo preço de custo atual. Valores em reais.",
        parameters: {
            type: "object",
            properties: {
                ...dateRangeProperties,
                ordenarPor: { type: "string", enum: ["quantidade", "faturamento"], description: "Critério do ranking. Padrão: quantidade." },
                ordem: { type: "string", enum: ["maiores", "menores"], description: "Mais vendidos (maiores) ou menos vendidos (menores). Padrão: maiores." },
                limite: { type: "integer", description: "Quantos produtos retornar (1 a 50). Padrão: 10." },
            },
            required: ["dataInicial", "dataFinal"],
            additionalProperties: false,
        },
        async run(args, context) {
            const { startDate, endDate } = dateRangeArgs(args)
            const orderBy = enumArg(args, "ordenarPor", ["quantidade", "faturamento"] as const, "quantidade")
            const direction = enumArg(args, "ordem", ["maiores", "menores"] as const, "maiores")
            const limit = intArg(args, "limite", 10, 1, 50)
            const { startUtc, endExclusiveUtc } = localDateRangeToUtc(startDate, endDate, context.timeZone)
            const db = getTenantDb(context.tenantSlug)

            const quantity = sql<number>`sum(${saleItem.quantity})`
            const revenue = sql<number>`sum(${saleItem.totalPrice} - coalesce(${saleItem.discount}, 0))`
            const sortExpression = orderBy === "quantidade" ? quantity : revenue

            const rows = await db
                .select({
                    productId: product.id,
                    name: product.name,
                    buyPrice: product.buyPrice,
                    quantity,
                    revenue,
                })
                .from(saleItem)
                .innerJoin(sale, eq(saleItem.saleId, sale.id))
                .innerJoin(product, eq(saleItem.productId, product.id))
                .where(and(settledSalesInRange(startUtc, endExclusiveUtc), isNull(saleItem.deletedAt)))
                .groupBy(product.id)
                .orderBy(direction === "maiores" ? desc(sortExpression) : asc(sortExpression))
                .limit(limit)

            return {
                periodo: { dataInicial: startDate, dataFinal: endDate },
                observacao: "Produtos sem nenhuma venda no período não aparecem; use produtos_parados para eles.",
                produtos: rows.map((row) => ({
                    id: row.productId,
                    nome: row.name,
                    quantidadeVendida: Number(row.quantity),
                    faturamento: reais(row.revenue),
                    lucroBrutoEstimado: row.productId === GENERIC_PRODUCT_ID
                        ? null
                        : reais(Number(row.revenue) - row.buyPrice * Number(row.quantity)),
                })),
            }
        },
    },
    {
        name: "consultar_estoque",
        label: "Estoque",
        description: "Consulta produtos do catálogo com saldo em estoque, preço de venda, preço de custo, margem e categoria. Permite buscar por nome/código de barras e filtrar estoque baixo. Valores em reais.",
        parameters: {
            type: "object",
            properties: {
                busca: { type: "string", description: "Trecho do nome ou código de barras (GTIN)." },
                estoqueMaximo: { type: "integer", description: "Se informado, retorna só produtos com saldo menor ou igual a este valor (estoque baixo)." },
                limite: { type: "integer", description: "Quantos produtos retornar (1 a 100). Padrão: 30." },
            },
            additionalProperties: false,
        },
        async run(args, context) {
            const search = optionalStringArg(args, "busca")
            const maxStock = args.estoqueMaximo === undefined || args.estoqueMaximo === null
                ? undefined
                : intArg(args, "estoqueMaximo", 0, -1_000_000, 1_000_000)
            const limit = intArg(args, "limite", 30, 1, 100)
            const db = getTenantDb(context.tenantSlug)

            const conditions = [isNull(product.deletedAt), ne(product.id, GENERIC_PRODUCT_ID)]
            if (search) {
                const pattern = `%${search.replace(/[%_]/g, "")}%`
                conditions.push(sql`(${product.name} like ${pattern} or ${product.gtin} like ${pattern})`)
            }

            const [products, balances] = await Promise.all([
                db
                    .select({
                        id: product.id,
                        name: product.name,
                        gtin: product.gtin,
                        sellPrice: product.sellPrice,
                        buyPrice: product.buyPrice,
                        categoryName: category.name,
                    })
                    .from(product)
                    .leftJoin(category, eq(product.categoryId, category.id))
                    .where(and(...conditions))
                    .orderBy(asc(product.name)),
                stockBalances(context.tenantSlug),
            ])

            const matching = products
                .map((row) => ({ ...row, stock: balances.get(row.id) ?? 0 }))
                .filter((row) => maxStock === undefined || row.stock <= maxStock)
                .sort((a, b) => maxStock === undefined ? 0 : a.stock - b.stock)

            return {
                totalEncontrados: matching.length,
                produtos: matching.slice(0, limit).map((row) => ({
                    id: row.id,
                    nome: row.name,
                    codigoBarras: row.gtin,
                    categoria: row.categoryName,
                    saldoEstoque: row.stock,
                    precoVenda: reais(row.sellPrice),
                    precoCusto: reais(row.buyPrice),
                    margemPercentual: row.sellPrice > 0
                        ? Math.round(((row.sellPrice - row.buyPrice) / row.sellPrice) * 1000) / 10
                        : null,
                    valorEmEstoqueCusto: reais(Math.max(row.stock, 0) * row.buyPrice),
                })),
            }
        },
    },
    {
        name: "produtos_parados",
        label: "Produtos parados",
        description: "Lista produtos com saldo positivo em estoque que não tiveram venda nos últimos N dias, com o capital parado (saldo × custo). Valores em reais.",
        parameters: {
            type: "object",
            properties: {
                dias: { type: "integer", description: "Janela sem vendas, em dias (1 a 365). Padrão: 30." },
                limite: { type: "integer", description: "Quantos produtos retornar (1 a 100). Padrão: 30." },
            },
            additionalProperties: false,
        },
        async run(args, context) {
            const days = intArg(args, "dias", 30, 1, 365)
            const limit = intArg(args, "limite", 30, 1, 100)
            const db = getTenantDb(context.tenantSlug)

            const [products, lastSales, balances] = await Promise.all([
                db
                    .select({ id: product.id, name: product.name, buyPrice: product.buyPrice })
                    .from(product)
                    .where(and(isNull(product.deletedAt), ne(product.id, GENERIC_PRODUCT_ID))),
                db
                    .select({ productId: saleItem.productId, lastSaleAt: max(sale.settledAt) })
                    .from(saleItem)
                    .innerJoin(sale, eq(saleItem.saleId, sale.id))
                    .where(and(isNotNull(sale.settledAt), isNull(sale.cancelledAt), isNull(sale.deletedAt), isNull(saleItem.deletedAt)))
                    .groupBy(saleItem.productId),
                stockBalances(context.tenantSlug),
            ])

            const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19).replace("T", " ")
            const lastSaleByProduct = new Map(lastSales.map((row) => [row.productId, row.lastSaleAt]))

            const idle = products
                .map((row) => ({
                    ...row,
                    stock: balances.get(row.id) ?? 0,
                    lastSaleAt: lastSaleByProduct.get(row.id) ?? null,
                }))
                .filter((row) => row.stock > 0 && (!row.lastSaleAt || row.lastSaleAt < cutoff))
                .sort((a, b) => b.stock * b.buyPrice - a.stock * a.buyPrice)

            return {
                diasSemVenda: days,
                totalEncontrados: idle.length,
                capitalParadoTotal: reais(idle.reduce((sum, row) => sum + row.stock * row.buyPrice, 0)),
                produtos: idle.slice(0, limit).map((row) => ({
                    id: row.id,
                    nome: row.name,
                    saldoEstoque: row.stock,
                    ultimaVenda: row.lastSaleAt ? utcToLocalDate(row.lastSaleAt, context.timeZone) : null,
                    capitalParado: reais(row.stock * row.buyPrice),
                })),
            }
        },
    },
    {
        name: "contas_a_pagar",
        label: "Contas a pagar",
        description: "Contas a pagar com vencimento no período, com totais por situação (pendente, paga, vencida). Valores em reais.",
        parameters: {
            type: "object",
            properties: {
                ...dateRangeProperties,
                situacao: { type: "string", enum: ["pending", "paid", "overdue", "all"], description: "Filtra a lista: pendentes, pagas, vencidas ou todas. Padrão: all." },
            },
            required: ["dataInicial", "dataFinal"],
            additionalProperties: false,
        },
        async run(args, context) {
            const { startDate, endDate } = dateRangeArgs(args)
            const status = enumArg<PayableStatus>(args, "situacao", payableStatuses, "all")
            const result = await getPayables(context.tenantSlug, {
                startDate,
                endDate,
                status,
                pageSize: 50,
                timeZone: context.timeZone,
            })

            const { summary } = result
            const statusTotal = (entry: { count: number, amount: number }) => ({
                quantidade: entry.count,
                valor: reais(entry.amount),
            })

            return {
                periodo: { dataInicial: startDate, dataFinal: endDate },
                hoje: result.today,
                totaisDoPeriodo: {
                    pendentes: statusTotal(summary.pending),
                    vencidas: statusTotal(summary.overdue),
                    pagas: statusTotal(summary.paid),
                },
                totalDoFiltro: { quantidade: summary.count, valor: reais(summary.total) },
                contasListadas: result.rows.length,
                contas: result.rows.map((row) => ({
                    descricao: row.description,
                    valor: reais(row.amount),
                    vencimento: row.dueDate,
                    pagoEm: row.paidDate,
                    situacao: row.status,
                    favorecido: row.payee?.name ?? null,
                    categoria: row.category?.name ?? null,
                    parcela: row.installmentCount > 1 ? `${row.installmentNumber}/${row.installmentCount}` : null,
                })),
            }
        },
    },
    {
        name: "recebimentos",
        label: "Recebimentos",
        description: "Valores recebidos de vendas no período (por data de pagamento): total recebido, estornado, líquido e quebra por forma de pagamento. Valores em reais.",
        parameters: {
            type: "object",
            properties: dateRangeProperties,
            required: ["dataInicial", "dataFinal"],
            additionalProperties: false,
        },
        async run(args, context) {
            const { startDate, endDate } = dateRangeArgs(args)
            const result = await getReceivables(context.tenantSlug, {
                startDate,
                endDate,
                status: "all",
                pageSize: 1,
                timeZone: context.timeZone,
            })

            return {
                periodo: { dataInicial: startDate, dataFinal: endDate },
                quantidadePagamentos: result.summary.count,
                recebido: reais(result.summary.received),
                estornado: reais(result.summary.refunded),
                liquido: reais(result.summary.net),
                porFormaDePagamento: result.byPaymentMethod.map((entry) => ({
                    forma: entry.method,
                    quantidade: entry.count,
                    recebido: reais(entry.received),
                    estornado: reais(entry.refunded),
                })),
            }
        },
    },
    {
        name: "caixa_atual",
        label: "Caixa",
        description: "Situação do caixa mais recente: aberto ou fechado, valores de abertura, entradas, saídas, saldo esperado e vendas por forma de pagamento. Valores em reais.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false,
        },
        async run(_args, context) {
            const cash = await currentCash(context.tenantSlug)
            if (!cash) return { caixa: null, observacao: "Nenhum caixa foi aberto ainda." }

            return {
                situacao: cash.status === "open" ? "aberto" : "fechado",
                abertoEm: cash.openedAt,
                fechadoEm: cash.closedAt,
                observacaoDatas: "abertoEm e fechadoEm estão em UTC.",
                abertura: reais(cash.amounts.opening),
                entradas: reais(cash.amounts.inflow),
                saidas: reais(cash.amounts.outflow),
                saldoEsperado: reais(cash.amounts.expectedClosing),
                saldoInformadoNoFechamento: cash.amounts.actualClosing === null ? null : reais(cash.amounts.actualClosing),
                diferenca: cash.amounts.difference === null ? null : reais(cash.amounts.difference),
                vendasPorFormaDePagamento: cash.paymentSummary
                    .filter((entry) => entry.salesCount > 0)
                    .map((entry) => ({ forma: entry.method, quantidade: entry.salesCount, valor: reais(entry.amount) })),
                movimentacoes: cash.movementSummary,
            }
        },
    },
    {
        name: "buscar_clientes",
        label: "Clientes",
        description: "Busca clientes por nome, documento, e-mail ou telefone, com número de compras, total gasto e data da última compra. Sem busca, retorna os clientes que mais compraram. Valores em reais.",
        parameters: {
            type: "object",
            properties: {
                busca: { type: "string", description: "Trecho do nome, documento, e-mail ou telefone." },
                limite: { type: "integer", description: "Quantos clientes retornar (1 a 50). Padrão: 10." },
            },
            additionalProperties: false,
        },
        async run(args, context) {
            const search = optionalStringArg(args, "busca")
            const limit = intArg(args, "limite", 10, 1, 50)
            const db = getTenantDb(context.tenantSlug)

            const conditions = [isNull(client.deletedAt)]
            if (search) {
                const pattern = `%${search.replace(/[%_]/g, "")}%`
                conditions.push(sql`(${like(client.name, pattern)} or ${like(client.document, pattern)} or ${like(client.email, pattern)} or ${like(client.phone, pattern)})`)
            }

            const purchases = sql<number>`count(${sale.id})`
            const spent = sql<number>`coalesce(sum(${sale.totalAmount}), 0)`

            const rows = await db
                .select({
                    id: client.id,
                    name: client.name,
                    document: client.document,
                    email: client.email,
                    phone: client.phone,
                    purchases,
                    spent,
                    lastPurchaseAt: max(sale.settledAt),
                })
                .from(client)
                .leftJoin(sale, and(
                    eq(sale.clientId, client.id),
                    isNotNull(sale.settledAt),
                    isNull(sale.cancelledAt),
                    isNull(sale.deletedAt),
                ))
                .where(and(...conditions))
                .groupBy(client.id)
                .orderBy(desc(spent), asc(client.name))
                .limit(limit)

            return {
                clientes: rows.map((row) => ({
                    id: row.id,
                    nome: row.name,
                    documento: row.document,
                    email: row.email,
                    telefone: row.phone,
                    compras: Number(row.purchases),
                    totalGasto: reais(row.spent),
                    ultimaCompra: row.lastPurchaseAt ? utcToLocalDate(row.lastPurchaseAt, context.timeZone) : null,
                })),
            }
        },
    },
]

const toolsByName = new Map(assistantTools.map((tool) => [tool.name, tool]))

export function getAssistantTool(name: string) {
    return toolsByName.get(name)
}

export function assistantToolDefinitions() {
    return assistantTools.map((tool) => ({
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        },
    }))
}

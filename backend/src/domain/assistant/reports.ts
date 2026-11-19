import { getTenantDb } from "@/db/db"
import { getCashes, getCashMovements } from "../tenant/cash/CashService"
import { getCategories } from "../tenant/category/CategoryService"
import { getClients } from "../tenant/client/ClientService"
import { getPayables, type PayableStatus } from "../tenant/payables/PayablesService"
import { getPayees } from "../tenant/payables/PayeesService"
import { getReceivables, type ReceivableStatusFilter } from "../tenant/receivables/ReceivablesService"
import { getSales, type PaymentMethod } from "../tenant/sales/SalesService"
import { getStockReport } from "../tenant/stock/StockService"
import { AppError } from "../../utils/errors"
import { isValidDateInput } from "../../utils/dates"
import { resolveByName } from "./actions"

// Relatórios que o assistente entrega como arquivo. Os nomes seguem as telas
// do sistema; o frontend gera o PDF ou CSV com os mesmos dados delas.
export const REPORT_TYPES = [
    "historico_vendas",
    "relatorio_vendas",
    "historico_caixas",
    "relatorio_caixas",
    "extrato_caixa",
    "estoque",
    "contas_a_pagar",
    "contas_a_receber",
] as const

export type AssistantReportType = (typeof REPORT_TYPES)[number]
export type AssistantReportFormat = "pdf" | "csv"

/** Filtros no mesmo formato usado pelas telas de relatório. */
export type AssistantReportFilters = {
    startDate?: string
    endDate?: string
    cashId?: string
    clientId?: string
    paymentMethod?: PaymentMethod
    status?: string
    categoryId?: string
    stock?: "available" | "empty"
    payeeId?: string
}

// Anexo de download devolvido por gerar_relatorio; o frontend busca os dados
// e gera o arquivo com os mesmos endpoints e montagens das telas
export type AssistantDownload = {
    kind: "report"
    report: AssistantReportType
    format: AssistantReportFormat
    title: string
    filters: AssistantReportFilters
    /** Rótulos legíveis dos filtros, na ordem em que vão para o cabeçalho. */
    labels: Array<{ label: string, value: string }>
}

const REPORT_TITLES: Record<AssistantReportType, string> = {
    historico_vendas: "Histórico de vendas",
    relatorio_vendas: "Relatório de vendas",
    historico_caixas: "Histórico de caixas",
    relatorio_caixas: "Relatório de caixas",
    extrato_caixa: "Extrato do caixa",
    estoque: "Relatório de estoque",
    contas_a_pagar: "Contas a pagar",
    contas_a_receber: "Contas a receber",
}

type FilterName = "periodo" | "caixa" | "cliente" | "formaPagamento" | "situacao" | "categoria" | "estoque" | "favorecido"

// Filtros aceitos por relatório, iguais aos das telas
const ALLOWED_FILTERS: Record<AssistantReportType, FilterName[]> = {
    historico_vendas: ["periodo", "caixa", "cliente", "formaPagamento"],
    relatorio_vendas: ["periodo", "caixa", "cliente"],
    historico_caixas: ["periodo", "situacao"],
    relatorio_caixas: ["periodo", "caixa", "situacao"],
    extrato_caixa: ["caixa"],
    estoque: ["periodo", "caixa", "categoria", "estoque"],
    contas_a_pagar: ["periodo", "situacao", "favorecido"],
    contas_a_receber: ["periodo", "caixa", "cliente", "situacao"],
}

const ARG_FOR_FILTER: Record<Exclude<FilterName, "periodo">, string> = {
    caixa: "caixa",
    cliente: "cliente",
    formaPagamento: "formaPagamento",
    situacao: "situacao",
    categoria: "categoria",
    estoque: "estoque",
    favorecido: "favorecido",
}

const PAYMENT_METHOD_ARGS: Record<string, { value: PaymentMethod, label: string }> = {
    dinheiro: { value: "cash", label: "dinheiro" },
    pix: { value: "pix", label: "PIX" },
    debito: { value: "debit", label: "débito" },
    credito: { value: "credit", label: "crédito" },
    cheque: { value: "voucher", label: "cheque" },
}

const STATUS_ARGS: Partial<Record<AssistantReportType, { fallback: string, values: Record<string, { value: string, label: string }> }>> = {
    historico_caixas: {
        fallback: "todos",
        values: {
            abertos: { value: "open", label: "abertos" },
            fechados: { value: "closed", label: "fechados" },
            todos: { value: "all", label: "todos" },
        },
    },
    relatorio_caixas: {
        fallback: "todos",
        values: {
            abertos: { value: "open", label: "abertos" },
            fechados: { value: "closed", label: "fechados" },
            todos: { value: "all", label: "todos" },
        },
    },
    contas_a_pagar: {
        fallback: "todas",
        values: {
            pendentes: { value: "pending", label: "pendentes" },
            pagas: { value: "paid", label: "pagos" },
            vencidas: { value: "overdue", label: "vencidos" },
            todas: { value: "all", label: "todos" },
        },
    },
    contas_a_receber: {
        fallback: "recebidos",
        values: {
            recebidos: { value: "paid", label: "recebidos" },
            estornados: { value: "refunded", label: "estornados" },
            todos: { value: "all", label: "todos" },
        },
    },
}

const STOCK_ARGS: Record<string, { value: "available" | "empty", label: string }> = {
    com_estoque: { value: "available", label: "com estoque" },
    sem_estoque: { value: "empty", label: "sem estoque" },
}

export const reportToolParameters = {
    type: "object" as const,
    properties: {
        tipo: {
            type: "string",
            enum: [...REPORT_TYPES],
            description: "historico_vendas (lista de vendas com produtos), relatorio_vendas (totais e ranking de produtos e clientes), historico_caixas (lista de caixas), relatorio_caixas (totais por forma de pagamento), extrato_caixa (entradas e saídas de um caixa), estoque (movimentação e posição de estoque), contas_a_pagar, contas_a_receber. Aceitam o número do caixa no lugar do período: historico_vendas, relatorio_vendas, relatorio_caixas, estoque, contas_a_receber e extrato_caixa (obrigatório). Só por período: historico_caixas e contas_a_pagar.",
        },
        formato: { type: "string", enum: ["pdf", "csv"], description: "pdf (padrão) ou csv (planilha)." },
        dataInicial: { type: "string", description: "Data inicial (AAAA-MM-DD), inclusiva, no fuso da loja. Obrigatória, exceto quando caixa for informado." },
        dataFinal: { type: "string", description: "Data final (AAAA-MM-DD), inclusiva, no fuso da loja." },
        caixa: { type: "integer", description: "Número do caixa (nº exibido no sistema). Substitui o período. Obrigatório em extrato_caixa. Para descobrir o número, use listar_caixas (caixas de um dia ou período) ou caixa_atual (o mais recente)." },
        cliente: { type: "string", description: "Nome do cliente, ou \"sem cliente\". Vendas e contas a receber." },
        formaPagamento: { type: "string", enum: Object.keys(PAYMENT_METHOD_ARGS), description: "Só historico_vendas." },
        situacao: {
            type: "string",
            description: "Caixas: abertos, fechados ou todos (padrão). Contas a pagar: pendentes, pagas, vencidas ou todas (padrão). Contas a receber: recebidos (padrão), estornados ou todos.",
        },
        categoria: { type: "string", description: "Só estoque: nome da categoria de produto, ou \"sem categoria\"." },
        estoque: { type: "string", enum: Object.keys(STOCK_ARGS), description: "Só estoque: filtra produtos com ou sem saldo no fim do período." },
        favorecido: { type: "string", description: "Só contas_a_pagar: nome do favorecido." },
    },
    required: ["tipo"],
    additionalProperties: false as const,
}

function invalid(message: string): never {
    throw new AppError(message, 400, "INVALID_TOOL_ARGUMENT")
}

function stringArg(args: Record<string, unknown>, key: string) {
    const value = args[key]
    if (value === undefined || value === null) return undefined
    if (typeof value !== "string") invalid(`${key} deve ser um texto`)

    return value.trim() || undefined
}

function formatDate(value: string) {
    const [year, month, day] = value.split("-")
    return `${day}/${month}/${year}`
}

function isNoneName(value: string, words: string[]) {
    const normalized = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    return words.includes(normalized)
}

export async function buildReportDownload(
    args: Record<string, unknown>,
    context: { tenantSlug: string, timeZone: string },
) {
    const tipo = stringArg(args, "tipo")
    if (!tipo || !REPORT_TYPES.includes(tipo as AssistantReportType)) {
        invalid(`tipo deve ser um destes valores: ${REPORT_TYPES.join(", ")}`)
    }
    const report = tipo as AssistantReportType
    const formatArg = stringArg(args, "formato") ?? "pdf"
    if (formatArg !== "pdf" && formatArg !== "csv") invalid("formato deve ser pdf ou csv")
    const format = formatArg as AssistantReportFormat

    // Filtros que a tela do relatório não tem viram erro, para o modelo corrigir
    const allowed = ALLOWED_FILTERS[report]
    for (const [filter, arg] of Object.entries(ARG_FOR_FILTER)) {
        if (args[arg] !== undefined && args[arg] !== null && !allowed.includes(filter as FilterName)) {
            const accepted = allowed.map((name) => name === "periodo" ? "dataInicial/dataFinal" : ARG_FOR_FILTER[name as Exclude<FilterName, "periodo">])
            invalid(`${report} não aceita o filtro ${arg}. Filtros aceitos: ${accepted.join(", ")}`)
        }
    }

    const filters: AssistantReportFilters = {}
    const labels: AssistantDownload["labels"] = []
    let titleScope: string

    // Período ou caixa
    const cashNumber = args.caixa
    if (cashNumber !== undefined && cashNumber !== null) {
        if (typeof cashNumber !== "number" || !Number.isInteger(cashNumber) || cashNumber < 1) {
            invalid("caixa deve ser o número do caixa (inteiro positivo)")
        }

        const db = getTenantDb(context.tenantSlug)
        const cash = await db.query.cash.findFirst({
            where: (entry, { eq }) => eq(entry.number, cashNumber),
            columns: { id: true, number: true },
        })
        if (!cash) throw new AppError(`Não encontrei o caixa nº ${cashNumber}`, 400, "CASH_NOT_FOUND")

        filters.cashId = cash.id
        titleScope = `caixa nº ${cash.number}`
    } else {
        if (report === "extrato_caixa") invalid("extrato_caixa exige o número do caixa (caixa)")

        const startDate = stringArg(args, "dataInicial")
        const endDate = stringArg(args, "dataFinal")
        if (!startDate || !endDate || !isValidDateInput(startDate) || !isValidDateInput(endDate)) {
            invalid("informe dataInicial e dataFinal no formato AAAA-MM-DD, ou o número do caixa")
        }
        if (startDate > endDate) invalid("dataInicial não pode ser posterior a dataFinal")

        filters.startDate = startDate
        filters.endDate = endDate
        titleScope = `${formatDate(startDate)} a ${formatDate(endDate)}`
    }

    const clientName = stringArg(args, "cliente")
    if (clientName) {
        if (isNoneName(clientName, ["sem cliente", "nenhum", "nao informado"])) {
            filters.clientId = "none"
            labels.push({ label: "Cliente", value: "não informado" })
        } else {
            const clients = await getClients(context.tenantSlug)
            const clientId = resolveByName("cliente", clients, clientName, [])
            if (!clientId) throw new AppError(`Não encontrei cliente com o nome "${clientName}"`, 400, "CLIENT_NOT_FOUND")

            filters.clientId = clientId
            labels.push({ label: "Cliente", value: clients.find((entry) => String(entry.id) === clientId)?.name ?? clientName })
        }
    } else if (allowed.includes("cliente")) {
        labels.push({ label: "Cliente", value: "todos" })
    }

    const method = stringArg(args, "formaPagamento")
    if (method) {
        const entry = PAYMENT_METHOD_ARGS[method.toLowerCase()]
        if (!entry) invalid(`formaPagamento deve ser uma destas: ${Object.keys(PAYMENT_METHOD_ARGS).join(", ")}`)

        filters.paymentMethod = entry.value
        labels.push({ label: "Forma de pagamento", value: entry.label })
    } else if (allowed.includes("formaPagamento")) {
        labels.push({ label: "Forma de pagamento", value: "todas" })
    }

    const statusConfig = STATUS_ARGS[report]
    if (statusConfig) {
        const situation = stringArg(args, "situacao")?.toLowerCase() ?? statusConfig.fallback
        const entry = statusConfig.values[situation]
        if (!entry) invalid(`situacao deve ser uma destas: ${Object.keys(statusConfig.values).join(", ")}`)

        filters.status = entry.value
        labels.push({ label: "Situação", value: entry.label })
    }

    const categoryName = stringArg(args, "categoria")
    if (categoryName) {
        if (isNoneName(categoryName, ["sem categoria", "nenhuma"])) {
            filters.categoryId = "none"
            labels.push({ label: "Categoria", value: "sem categoria" })
        } else {
            const categories = await getCategories(context.tenantSlug)
            const categoryId = resolveByName("categoria", categories, categoryName, [])
            if (!categoryId) throw new AppError(`Não encontrei categoria com o nome "${categoryName}"`, 400, "CATEGORY_NOT_FOUND")

            filters.categoryId = categoryId
            labels.push({ label: "Categoria", value: categories.find((entry) => String(entry.id) === categoryId)?.name ?? categoryName })
        }
    } else if (allowed.includes("categoria")) {
        labels.push({ label: "Categoria", value: "todas as categorias" })
    }

    const stockArg = stringArg(args, "estoque")
    if (stockArg) {
        const entry = STOCK_ARGS[stockArg.toLowerCase()]
        if (!entry) invalid(`estoque deve ser um destes: ${Object.keys(STOCK_ARGS).join(", ")}`)

        filters.stock = entry.value
        labels.push({ label: "Estoque", value: entry.label })
    } else if (allowed.includes("estoque")) {
        labels.push({ label: "Estoque", value: "todos" })
    }

    const payeeName = stringArg(args, "favorecido")
    if (payeeName) {
        const payees = await getPayees(context.tenantSlug)
        const payeeId = resolveByName("favorecido", payees, payeeName, [])
        if (!payeeId) throw new AppError(`Não encontrei favorecido com o nome "${payeeName}"`, 400, "PAYEE_NOT_FOUND")

        filters.payeeId = payeeId
        labels.push({ label: "Favorecido", value: payees.find((entry) => entry.id === payeeId)?.name ?? payeeName })
    } else if (allowed.includes("favorecido")) {
        labels.push({ label: "Favorecido", value: "todos" })
    }

    const count = await countRecords(report, filters, context)
    const download: AssistantDownload = {
        kind: "report",
        report,
        format,
        title: `${REPORT_TITLES[report]} · ${titleScope}`,
        filters,
        labels,
    }

    return { arquivo: download, formato: format, quantidadeRegistros: count }
}

// Quantidade de linhas do relatório, para o modelo avisar quando vier vazio
async function countRecords(
    report: AssistantReportType,
    filters: AssistantReportFilters,
    context: { tenantSlug: string, timeZone: string },
) {
    const { tenantSlug, timeZone } = context
    const period = filters.cashId
        ? { cashId: filters.cashId }
        : { startDate: filters.startDate, endDate: filters.endDate }
    const clientId = filters.clientId === undefined
        ? undefined
        : filters.clientId === "none" ? "none" as const : Number(filters.clientId)

    switch (report) {
        case "historico_vendas":
        case "relatorio_vendas":
            return (await getSales(tenantSlug, { ...period, clientId, paymentMethod: filters.paymentMethod, timeZone })).length
        case "historico_caixas":
        case "relatorio_caixas":
            return (await getCashes(tenantSlug, {
                ...period,
                status: filters.status === "open" || filters.status === "closed" ? filters.status : undefined,
                timeZone,
            })).length
        case "extrato_caixa":
            return (await getCashMovements(tenantSlug, filters.cashId!)).movements.length
        case "estoque": {
            const stock = await getStockReport(tenantSlug, { ...period, timeZone })
            return stock.products.filter((entry) => {
                if (filters.categoryId === "none" && entry.category) return false
                if (filters.categoryId && filters.categoryId !== "none" && String(entry.category?.id) !== filters.categoryId) return false
                if (filters.stock === "available" && entry.closing <= 0) return false
                if (filters.stock === "empty" && entry.closing > 0) return false
                return true
            }).length
        }
        case "contas_a_pagar":
            return (await getPayables(tenantSlug, {
                startDate: filters.startDate!,
                endDate: filters.endDate!,
                status: filters.status as PayableStatus | "all",
                payeeId: filters.payeeId,
                pageSize: 1,
                timeZone,
            })).summary.count
        case "contas_a_receber":
            return (await getReceivables(tenantSlug, {
                ...period,
                clientId,
                status: filters.status as ReceivableStatusFilter,
                pageSize: 1,
                timeZone,
            })).summary.count
    }
}

type LegacyDownload = {
    kind: "payables_pdf" | "receivables_pdf"
    title: string
    filters: { startDate: string, endDate: string, status: string, payeeId?: string }
    labels: { status: string, payee?: string }
}

// Conversas antigas guardaram o anexo no formato anterior (só PDF de contas)
export function normalizeDownload(value: unknown): AssistantDownload | undefined {
    if (!value || typeof value !== "object") return undefined

    const download = value as AssistantDownload | LegacyDownload
    if (download.kind === "report") return download

    if (download.kind === "payables_pdf" || download.kind === "receivables_pdf") {
        const isPayables = download.kind === "payables_pdf"

        return {
            kind: "report",
            report: isPayables ? "contas_a_pagar" : "contas_a_receber",
            format: "pdf",
            title: download.title,
            filters: download.filters,
            labels: [
                { label: "Situação", value: download.labels.status },
                ...(isPayables ? [{ label: "Favorecido", value: download.labels.payee ?? "todos" }] : [{ label: "Cliente", value: "todos" }]),
            ],
        }
    }

    return undefined
}

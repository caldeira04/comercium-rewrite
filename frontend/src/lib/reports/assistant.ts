import { api } from "@/lib/api"
import { throwApiError } from "@/lib/api-error"
import type { AssistantDownload } from "@/hooks/use-assistant"
import { downloadCsv } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { buildCashStatementExport } from "./cash-statement"
import { buildCashListExport, buildCashReportExport } from "./cash-report"
import { buildPayablesExport, buildReceivablesExport } from "./finance"
import { buildSalesHistoryExport } from "./sales-history"
import { buildSalesReportExport } from "./sales-report"
import { buildStockReportExport, matchesStockFilters } from "./stock"
import type { ReportContext } from "./types"

type Query = Record<string, string>

function compact(values: Record<string, string | undefined>): Query {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== "all")) as Query
}

function labelOf(download: AssistantDownload, label: string, fallback: string) {
    return download.labels.find((entry) => entry.label === label)?.value ?? fallback
}

// Busca os dados pelos mesmos endpoints das telas e gera o arquivo pedido ao
// assistente. Devolve false quando o relatório veio vazio.
export async function exportAssistantReport(
    download: AssistantDownload,
    context: Pick<ReportContext, "tenantName" | "formatDateTime"> & {
        /** Linha de período ou caixa e sufixo do arquivo, já resolvidos. */
        period: { filter: ReportExport["filters"][number], fileSuffix: string }
        cashLabel?: string
    },
): Promise<{ ok: true, truncated?: boolean } | { ok: false }> {
    const { filters, format } = download
    const period = filters.cashId
        ? { cashId: filters.cashId }
        : { startDate: filters.startDate, endDate: filters.endDate }
    const reportContext: ReportContext = {
        tenantName: context.tenantName,
        formatDateTime: context.formatDateTime,
        fileSuffix: context.period.fileSuffix,
        filters: [context.period.filter, ...download.labels],
    }

    let report: ReportExport | null = null

    switch (download.report) {
        case "historico_vendas":
        case "relatorio_vendas": {
            const { data, error } = await api.tenant.sales.get({
                query: compact({ ...period, clientId: filters.clientId, paymentMethod: filters.paymentMethod }),
            })
            if (error) throwApiError(error)
            if (!data || data.length === 0) return { ok: false }

            report = download.report === "historico_vendas"
                ? buildSalesHistoryExport(data, reportContext)
                : buildSalesReportExport(data, reportContext)
            break
        }
        case "historico_caixas":
        case "relatorio_caixas": {
            const { data, error } = await api.tenant.cash.get({ query: compact({ ...period, status: filters.status }) })
            if (error) throwApiError(error)
            if (!data || data.length === 0) return { ok: false }

            report = download.report === "historico_caixas"
                ? buildCashListExport(data, reportContext)
                : buildCashReportExport(data, reportContext)
            break
        }
        case "extrato_caixa": {
            const { data, error } = await api.tenant.cash({ cashId: filters.cashId! }).movements.get()
            if (error) throwApiError(error)
            if (!data) return { ok: false }

            report = buildCashStatementExport(data, reportContext)
            break
        }
        case "estoque": {
            const { data, error } = await api.tenant.stock.report.get({ query: compact(period) })
            if (error) throwApiError(error)

            const products = data?.products.filter((product) => matchesStockFilters(product, {
                categoryId: filters.categoryId ?? "all",
                stock: filters.stock ?? "all",
            })) ?? []
            if (products.length === 0) return { ok: false }

            report = buildStockReportExport(products, reportContext)
            break
        }
        case "contas_a_receber": {
            const { data, error } = await api.tenant.receivables.export.get({
                query: compact({ ...period, clientId: filters.clientId, status: filters.status }),
            })
            if (error) throwApiError(error)
            if (!data || data.rows.length === 0) return { ok: false }

            if (format === "pdf") {
                const { generateReceivablesPdf } = await import("@/lib/receivables-pdf")
                generateReceivablesPdf({
                    tenantName: data.tenantName,
                    startDate: filters.startDate ?? "",
                    endDate: filters.endDate ?? "",
                    cashLabel: filters.cashId ? context.cashLabel : undefined,
                    statusLabel: labelOf(download, "Situação", "recebidos"),
                    clientLabel: labelOf(download, "Cliente", "todos"),
                    timeZone: data.timeZone,
                    rows: data.rows,
                    summary: data.summary,
                })
                return { ok: true, truncated: data.truncated }
            }

            report = buildReceivablesExport(data, reportContext)
            downloadCsv(report.fileName, report.csv.headers, report.csv.rows)
            return { ok: true, truncated: data.truncated }
        }
        case "contas_a_pagar": {
            const { data, error } = await api.tenant.payables.export.get({
                query: {
                    startDate: filters.startDate ?? "",
                    endDate: filters.endDate ?? "",
                    status: (filters.status ?? "all") as "all",
                    ...(filters.payeeId ? { payeeId: filters.payeeId } : {}),
                },
            })
            if (error) throwApiError(error)
            if (!data || data.rows.length === 0) return { ok: false }

            if (format === "pdf") {
                const { generatePayablesPdf } = await import("@/lib/payables-pdf")
                generatePayablesPdf({
                    tenantName: data.tenantName,
                    startDate: filters.startDate ?? "",
                    endDate: filters.endDate ?? "",
                    statusLabel: labelOf(download, "Situação", "todos"),
                    payeeLabel: labelOf(download, "Favorecido", "todos"),
                    bankAccountLabel: "todas",
                    rows: data.rows,
                    summary: data.summary,
                    truncated: data.truncated,
                })
                return { ok: true, truncated: data.truncated }
            }

            report = buildPayablesExport(data, reportContext)
            downloadCsv(report.fileName, report.csv.headers, report.csv.rows)
            return { ok: true, truncated: data.truncated }
        }
    }

    if (format === "csv") {
        downloadCsv(report.fileName, report.csv.headers, report.csv.rows)
    } else {
        const { generateReportPdf } = await import("@/lib/export/report-pdf")
        generateReportPdf(report)
    }

    return { ok: true }
}

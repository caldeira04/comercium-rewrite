import type { CashListItem } from "@/lib/api-types"
import { csvMoney } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { formatCurrency, translatePaymentMethod } from "@/utils/finance"
import type { ReportContext } from "./types"

type PaymentMethod = "cash" | "pix" | "debit" | "credit" | "voucher"

export function getPaymentRows(cashes: CashListItem[]) {
    const rows = new Map<PaymentMethod, { method: PaymentMethod, amount: number, salesCount: number }>()

    cashes.forEach((cash) => {
        cash.paymentSummary.forEach((payment) => {
            const method = payment.method as PaymentMethod
            const current = rows.get(method) ?? { method, amount: 0, salesCount: 0 }
            rows.set(method, {
                method,
                amount: current.amount + payment.amount,
                salesCount: current.salesCount + payment.salesCount,
            })
        })
    })

    return [...rows.values()].sort((a, b) => b.amount - a.amount)
}

export function summarizeCashes(cashes: CashListItem[]) {
    const inflow = cashes.reduce((total, cash) => total + cash.amounts.inflow, 0)
    const outflow = cashes.reduce((total, cash) => total + cash.amounts.outflow, 0)

    return {
        count: cashes.length,
        closed: cashes.filter((cash) => cash.status === "closed").length,
        inflow,
        outflow,
        net: inflow - outflow,
        difference: cashes.reduce((total, cash) => total + (cash.amounts.difference ?? 0), 0),
    }
}

function cashRows(cashes: CashListItem[], context: ReportContext) {
    return cashes.map((cash) => ({
        cash,
        opened: context.formatDateTime(cash.openedAt),
        closed: cash.closedAt ? context.formatDateTime(cash.closedAt) : null,
    }))
}

/** Lista de caixas (tela "histórico de caixas"). */
export function buildCashListExport(cashes: CashListItem[], context: ReportContext): ReportExport {
    const rows = cashRows(cashes, context)

    return {
        title: "Histórico de caixas",
        fileName: `historico-de-caixas_${context.fileSuffix}`,
        tenantName: context.tenantName,
        orientation: "landscape",
        filters: context.filters,
        tables: [{
            head: ["nº", "situação", "abertura", "fechamento", "operador", "abertura (R$)", "entradas", "saídas", "esperado", "contado", "diferença"],
            rows: rows.map(({ cash, opened, closed }) => [
                String(cash.number),
                cash.status === "open" ? "aberto" : "fechado",
                `${opened.date} ${opened.time}`,
                closed ? `${closed.date} ${closed.time}` : "-",
                cash.users.createdBy?.login ?? "sistema",
                formatCurrency(cash.amounts.opening),
                formatCurrency(cash.amounts.inflow),
                formatCurrency(cash.amounts.outflow),
                formatCurrency(cash.amounts.expectedClosing),
                cash.amounts.actualClosing === null ? "-" : formatCurrency(cash.amounts.actualClosing),
                cash.amounts.difference === null ? "-" : formatCurrency(cash.amounts.difference),
            ]),
            align: { 0: "right", 5: "right", 6: "right", 7: "right", 8: "right", 9: "right", 10: "right" },
        }],
        csv: {
            headers: ["nº", "situação", "data de abertura", "hora de abertura", "data de fechamento", "hora de fechamento", "operador", "abertura", "entradas", "saídas", "esperado", "contado", "diferença"],
            rows: rows.map(({ cash, opened, closed }) => [
                cash.number,
                cash.status === "open" ? "aberto" : "fechado",
                opened.date,
                opened.time,
                closed?.date ?? "",
                closed?.time ?? "",
                cash.users.createdBy?.login ?? "sistema",
                csvMoney(cash.amounts.opening),
                csvMoney(cash.amounts.inflow),
                csvMoney(cash.amounts.outflow),
                csvMoney(cash.amounts.expectedClosing),
                csvMoney(cash.amounts.actualClosing),
                csvMoney(cash.amounts.difference),
            ]),
        },
    }
}

/** Totais e formas de pagamento (tela "relatório de caixas"). */
export function buildCashReportExport(cashes: CashListItem[], context: ReportContext): ReportExport {
    const summary = summarizeCashes(cashes)
    const paymentRows = getPaymentRows(cashes)
    const rows = cashRows(cashes, context)

    return {
        title: "Relatório de caixas",
        fileName: `relatorio-de-caixas_${context.fileSuffix}`,
        tenantName: context.tenantName,
        filters: context.filters,
        metrics: [
            { label: "caixas", value: String(summary.count) },
            { label: "fechados", value: String(summary.closed) },
            { label: "entradas", value: formatCurrency(summary.inflow) },
            { label: "saídas", value: formatCurrency(summary.outflow) },
            { label: "saldo líquido", value: formatCurrency(summary.net) },
            { label: "diferença acumulada", value: formatCurrency(summary.difference) },
        ],
        tables: [
            {
                title: "Entradas por forma de pagamento",
                head: ["forma", "pagamentos", "total"],
                rows: paymentRows.map((row) => [translatePaymentMethod(row.method) ?? row.method, String(row.salesCount), formatCurrency(row.amount)]),
                align: { 1: "right", 2: "right" },
            },
            {
                title: "Caixas",
                head: ["nº", "abertura", "fechamento", "entradas", "saídas", "esperado", "contado", "diferença"],
                rows: rows.map(({ cash, opened, closed }) => [
                    String(cash.number),
                    `${opened.date} ${opened.time}`,
                    closed ? `${closed.date} ${closed.time}` : "aberto",
                    formatCurrency(cash.amounts.inflow),
                    formatCurrency(cash.amounts.outflow),
                    formatCurrency(cash.amounts.expectedClosing),
                    cash.amounts.actualClosing === null ? "-" : formatCurrency(cash.amounts.actualClosing),
                    cash.amounts.difference === null ? "-" : formatCurrency(cash.amounts.difference),
                ]),
                align: { 0: "right", 3: "right", 4: "right", 5: "right", 6: "right", 7: "right" },
            },
        ],
        csv: {
            headers: ["nº", "situação", "data de abertura", "hora de abertura", "data de fechamento", "hora de fechamento", "operador", "entradas", "saídas", "esperado", "contado", "diferença", "dinheiro", "PIX", "débito", "crédito", "cheque"],
            rows: rows.map(({ cash, opened, closed }) => {
                const byMethod = (method: string) => cash.paymentSummary.find((entry) => entry.method === method)?.amount ?? 0

                return [
                    cash.number,
                    cash.status === "open" ? "aberto" : "fechado",
                    opened.date,
                    opened.time,
                    closed?.date ?? "",
                    closed?.time ?? "",
                    cash.users.createdBy?.login ?? "sistema",
                    csvMoney(cash.amounts.inflow),
                    csvMoney(cash.amounts.outflow),
                    csvMoney(cash.amounts.expectedClosing),
                    csvMoney(cash.amounts.actualClosing),
                    csvMoney(cash.amounts.difference),
                    csvMoney(byMethod("cash")),
                    csvMoney(byMethod("pix")),
                    csvMoney(byMethod("debit")),
                    csvMoney(byMethod("credit")),
                    csvMoney(byMethod("voucher")),
                ]
            }),
        },
    }
}

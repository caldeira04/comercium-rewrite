import type { CashMovementStatement } from "@/lib/api-types"
import { csvMoney } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { formatCurrency } from "@/utils/finance"
import { formatCashMovementType, formatPaymentMethod, formatRecordNumber } from "@/utils/formatters"

export type CashStatementMovement = CashMovementStatement["movements"][number]

type FormatDateTime = (value: string | null | undefined) => { date: string, time: string }

/** Itens de uma venda em uma linha: "2× Coca 350ml, 1× Pão". */
export function summarizeSaleItems(items: Array<{ name: string, quantity: number }>) {
    return items.map((item) => `${item.quantity}× ${item.name}`).join(", ")
}

// Descrição legível de um lançamento do caixa: o que ocorreu (título) e o
// contexto (cliente, itens ou observação do operador).
export function describeCashMovement(movement: CashStatementMovement) {
    const method = movement.paymentMethod ? formatPaymentMethod({ method: movement.paymentMethod }) : null
    const sale = movement.sale
    const details: string[] = []

    if (movement.type === "open") {
        return { title: "abertura do caixa", details: movement.description ? [movement.description] : [] }
    }

    if (movement.type === "payment") {
        if (sale?.client) details.push(sale.client.name)
        if (sale && sale.items.length > 0) details.push(summarizeSaleItems(sale.items))

        const title = sale ? `venda ${formatRecordNumber(sale.number)}` : "pagamento recebido"

        return { title: [title, method].filter(Boolean).join(" · "), details }
    }

    if (movement.type === "refund") {
        if (sale?.client) details.push(sale.client.name)

        const title = sale ? `estorno da venda ${formatRecordNumber(sale.number)}` : "estorno de pagamento"

        return { title: [title, method].filter(Boolean).join(" · "), details }
    }

    // Suprimento e sangria: a observação digitada pelo operador é o contexto
    const title = movement.type === "topup" ? "suprimento" : movement.type === "drop" ? "sangria" : formatCashMovementType({ type: movement.type })

    return { title, details: movement.description ? [movement.description] : [] }
}

export function buildCashStatementExport(statement: CashMovementStatement, context: {
    tenantName: string
    formatDateTime: FormatDateTime
}): ReportExport {
    const { cash, totals } = statement
    const opened = context.formatDateTime(cash.openedAt)
    const closed = cash.closedAt ? context.formatDateTime(cash.closedAt) : null

    const rows = statement.movements.map((movement) => {
        const at = context.formatDateTime(movement.createdAt)
        const description = describeCashMovement(movement)

        return { movement, at, description }
    })

    return {
        title: `Extrato do caixa ${formatRecordNumber(cash.number)}`,
        fileName: `extrato-caixa-${cash.number}`,
        tenantName: context.tenantName,
        orientation: "landscape",
        filters: [
            { label: "Abertura", value: `${opened.date} ${opened.time}${cash.openedBy ? ` por ${cash.openedBy}` : ""}` },
            { label: "Fechamento", value: closed ? `${closed.date} ${closed.time}${cash.closedBy ? ` por ${cash.closedBy}` : ""}` : "caixa aberto" },
        ],
        metrics: [
            { label: "entradas", value: formatCurrency(totals.inflow) },
            { label: "saídas", value: formatCurrency(totals.outflow) },
            { label: "esperado", value: formatCurrency(totals.expectedClosing) },
            { label: "contado", value: totals.actualClosing === null ? "-" : formatCurrency(totals.actualClosing) },
            { label: "diferença", value: totals.difference === null ? "-" : formatCurrency(totals.difference) },
        ],
        tables: [{
            head: ["data", "tipo", "descrição", "operador", "entrada", "saída", "saldo"],
            rows: rows.map(({ movement, at, description }) => [
                `${at.date} ${at.time}`,
                formatCashMovementType({ type: movement.type }),
                [description.title, ...description.details].join("\n"),
                movement.user ?? "-",
                movement.nature === "in" ? formatCurrency(movement.amount) : "",
                movement.nature === "out" ? formatCurrency(movement.amount) : "",
                formatCurrency(movement.balance),
            ]),
            align: { 4: "right", 5: "right", 6: "right" },
            widths: { 0: 86, 1: 64, 3: 80, 4: 70, 5: 70, 6: 74 },
            empty: "nenhuma movimentação",
        }],
        csv: {
            headers: ["data", "hora", "tipo", "descrição", "detalhes", "venda nº", "forma", "operador", "entrada", "saída", "saldo"],
            rows: rows.map(({ movement, at, description }) => [
                at.date,
                at.time,
                formatCashMovementType({ type: movement.type }),
                description.title,
                description.details.join(" · "),
                movement.sale?.number ?? "",
                movement.paymentMethod ? formatPaymentMethod({ method: movement.paymentMethod }) : "",
                movement.user ?? "",
                movement.nature === "in" ? csvMoney(movement.amount) : "",
                movement.nature === "out" ? csvMoney(movement.amount) : "",
                csvMoney(movement.balance),
            ]),
        },
    }
}

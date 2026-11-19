import { payableStatusLabels } from "@/components/payables/constants"
import type { PayablesExport, ReceivablesExport } from "@/lib/api-types"
import { csvMoney } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { formatPaymentMethod } from "@/utils/formatters"
import { formatDateInput, formatDateTimeInZone } from "@/utils/time"
import type { ReportContext } from "./types"

const receivableStatusLabels: Record<string, string> = {
    paid: "recebido",
    refunded: "estornado",
    pending: "pendente",
    cancelled: "cancelado",
}

type Context = Omit<ReportContext, "formatDateTime">

/** CSV de contas a receber (o PDF continua com o gerador próprio). */
export function buildReceivablesExport(result: NonNullable<ReceivablesExport>, context: Context): ReportExport {
    return {
        title: "Contas a receber",
        fileName: `contas-a-receber_${context.fileSuffix}`,
        tenantName: context.tenantName,
        filters: context.filters,
        tables: [],
        csv: {
            headers: ["data do pagamento", "hora", "cliente", "venda nº", "forma", "valor", "situação"],
            rows: result.rows.map((row) => {
                const paidAt = formatDateTimeInZone(row.paidAt, result.timeZone)

                return [
                    paidAt.date,
                    paidAt.time,
                    row.client?.name ?? "não informado",
                    row.sale.number,
                    formatPaymentMethod({ method: row.paymentMethod }),
                    csvMoney(row.amount),
                    receivableStatusLabels[row.status] ?? row.status,
                ]
            }),
        },
    }
}

/** CSV de contas a pagar (o PDF continua com o gerador próprio). */
export function buildPayablesExport(result: NonNullable<PayablesExport>, context: Context): ReportExport {
    return {
        title: "Contas a pagar",
        fileName: `contas-a-pagar_${context.fileSuffix}`,
        tenantName: context.tenantName,
        filters: context.filters,
        tables: [],
        csv: {
            headers: ["vencimento", "parcela", "pagamento", "favorecido", "descrição", "categoria", "forma", "conta", "valor", "situação"],
            rows: result.rows.map((row) => [
                formatDateInput(row.dueDate),
                row.installmentCount > 1 ? `${row.installmentNumber}/${row.installmentCount}` : "",
                row.paidDate ? formatDateInput(row.paidDate) : "",
                row.payee?.name ?? "não informado",
                row.description,
                row.category?.name ?? "",
                row.paymentMethod ? formatPaymentMethod({ method: row.paymentMethod }) : "",
                row.bankAccount?.name ?? "",
                csvMoney(row.amount),
                payableStatusLabels[row.status] ?? row.status,
            ]),
        },
    }
}

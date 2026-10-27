import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { Payable } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"
import { formatPaymentMethod } from "@/utils/formatters"
import { formatDateInput } from "@/utils/time"

export type PayablesPdfInput = {
    tenantName: string
    startDate: string
    endDate: string
    statusLabel: string
    payeeLabel: string
    bankAccountLabel: string
    rows: Payable[]
    summary: {
        count: number
        total: number
        pending: { count: number, amount: number }
        overdue: { count: number, amount: number }
        paid: { count: number, amount: number }
    }
    truncated?: boolean
    generatedAt?: Date
}

const statusLabels: Record<string, string> = {
    paid: "pago",
    pending: "pendente",
    overdue: "vencido",
}

const originLabels: Record<string, string> = {
    manual: "manual",
    stock_purchase: "estoque",
}

export function generatePayablesPdf(input: PayablesPdfInput) {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
    const margin = 28
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const generatedAt = input.generatedAt ?? new Date()

    doc.setFontSize(16)
    doc.text("Contas a Pagar", margin, 36)

    doc.setFontSize(9)
    doc.text(input.tenantName, margin, 52)
    doc.text(`Período (vencimento): ${formatDateInput(input.startDate)} a ${formatDateInput(input.endDate)}`, margin, 66)
    doc.text(`Situação: ${input.statusLabel}`, margin, 80)
    doc.text(`Favorecido: ${input.payeeLabel}`, margin, 94)
    doc.text(`Conta: ${input.bankAccountLabel}`, margin, 108)
    doc.text(`Emitido em: ${generatedAt.toLocaleString("pt-BR")}`, pageWidth - margin, 52, { align: "right" })

    if (input.truncated) {
        doc.setTextColor(180, 0, 0)
        doc.text("Lista limitada a 5.000 lançamentos", pageWidth - margin, 66, { align: "right" })
        doc.setTextColor(0, 0, 0)
    }

    autoTable(doc, {
        startY: 124,
        head: [[
            "Vencimento",
            "Pagamento",
            "Favorecido",
            "Descrição",
            "Categoria",
            "Origem",
            "Forma",
            "Conta",
            "Valor",
            "Situação",
        ]],
        body: input.rows.map((row) => [
            formatDateInput(row.dueDate) + (row.installmentCount > 1 ? ` (${row.installmentNumber}/${row.installmentCount})` : ""),
            row.paidDate ? formatDateInput(row.paidDate) : "-",
            row.payee?.name ?? "não informado",
            row.description,
            row.category?.name ?? "-",
            originLabels[row.origin] ?? row.origin,
            row.paymentMethod ? formatPaymentMethod({ method: row.paymentMethod }) : "-",
            row.bankAccount?.name ?? "-",
            formatCurrency(row.amount),
            statusLabels[row.status] ?? row.status,
        ]),
        styles: {
            fontSize: 7,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [32, 32, 32],
            textColor: 255,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            0: { cellWidth: 76 },
            1: { cellWidth: 68 },
            2: { cellWidth: 96 },
            3: { cellWidth: 148 },
            4: { cellWidth: 82 },
            5: { cellWidth: 52 },
            6: { cellWidth: 56 },
            7: { cellWidth: 82 },
            8: { cellWidth: 70, halign: "right" },
            9: { cellWidth: 54 },
        },
        margin: { left: margin, right: margin },
    })

    const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    const finalY = Math.min((lastAutoTable?.finalY ?? 124) + 18, pageHeight - 40)

    doc.setFontSize(9)
    doc.text(`Lançamentos: ${input.summary.count}`, margin, finalY)
    doc.text(`Total: ${formatCurrency(input.summary.total)}`, margin + 110, finalY)
    doc.text(`Pendente: ${formatCurrency(input.summary.pending.amount)}`, margin + 240, finalY)
    doc.text(`Vencido: ${formatCurrency(input.summary.overdue.amount)}`, margin + 380, finalY)
    doc.text(`Pago: ${formatCurrency(input.summary.paid.amount)}`, margin + 510, finalY)

    const pageCount = doc.getNumberOfPages()

    for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page)
        doc.setFontSize(8)
        doc.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 16, { align: "right" })
    }

    doc.save(`contas-a-pagar_${input.startDate}_${input.endDate}.pdf`)
}

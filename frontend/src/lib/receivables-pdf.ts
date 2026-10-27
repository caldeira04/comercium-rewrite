import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { Receivable } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"
import { formatPaymentMethod } from "@/utils/formatters"
import { formatDateInput, formatDateTimeInZone } from "@/utils/time"

export type ReceivablesPdfInput = {
    tenantName: string
    startDate: string
    endDate: string
    statusLabel: string
    clientLabel: string
    timeZone: string
    rows: Receivable[]
    summary: {
        count: number
        received: number
        refunded: number
        net: number
    }
    generatedAt?: Date
}

const statusLabels: Record<string, string> = {
    paid: "recebido",
    refunded: "estornado",
    pending: "pendente",
    cancelled: "cancelado",
}

export function generateReceivablesPdf(input: ReceivablesPdfInput) {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
    const margin = 32
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const generatedAt = input.generatedAt ?? new Date()

    doc.setFontSize(16)
    doc.text("Contas a Receber", margin, 40)

    doc.setFontSize(9)
    doc.text(input.tenantName, margin, 56)
    doc.text(`Período: ${formatDateInput(input.startDate)} a ${formatDateInput(input.endDate)}`, margin, 70)
    doc.text(`Situação: ${input.statusLabel}`, margin, 84)
    doc.text(`Cliente: ${input.clientLabel}`, margin, 98)
    doc.text(`Emitido em: ${generatedAt.toLocaleString("pt-BR")}`, pageWidth - margin, 56, { align: "right" })

    autoTable(doc, {
        startY: 116,
        head: [["Data do pagamento", "Cliente", "Venda", "Forma", "Valor", "Situação"]],
        body: input.rows.map((row) => {
            const paidAt = formatDateTimeInZone(row.paidAt, input.timeZone)

            return [
                `${paidAt.date} ${paidAt.time}`.trim(),
                row.client?.name ?? "não informado",
                `#${row.sale.id.split("-")[0]}`,
                formatPaymentMethod({ method: row.paymentMethod }),
                formatCurrency(row.amount),
                statusLabels[row.status] ?? row.status,
            ]
        }),
        styles: {
            fontSize: 8,
            cellPadding: 4,
        },
        headStyles: {
            fillColor: [32, 32, 32],
            textColor: 255,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            0: { cellWidth: 110 },
            4: { cellWidth: 90, halign: "right" },
        },
        margin: { left: margin, right: margin },
    })

    const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    const finalY = Math.min((lastAutoTable?.finalY ?? 116) + 18, pageHeight - 40)

    doc.setFontSize(10)
    doc.text(`Lançamentos: ${input.summary.count}`, margin, finalY)
    doc.text(`Recebido: ${formatCurrency(input.summary.received)}`, margin + 150, finalY)
    doc.text(`Estornado: ${formatCurrency(input.summary.refunded)}`, margin + 310, finalY)
    doc.text(`Líquido: ${formatCurrency(input.summary.net)}`, margin + 470, finalY)

    const pageCount = doc.getNumberOfPages()

    for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page)
        doc.setFontSize(8)
        doc.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 16, { align: "right" })
    }

    doc.save(`contas-a-receber_${input.startDate}_${input.endDate}.pdf`)
}

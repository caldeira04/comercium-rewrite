import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { ReportExport } from "./types"

const MARGIN = 32
const HEAD_COLOR: [number, number, number] = [32, 32, 32]
const STRIPE_COLOR: [number, number, number] = [245, 245, 245]

function lastTableY(doc: jsPDF, fallback: number) {
    const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable

    return lastAutoTable?.finalY ?? fallback
}

// PDF padrão dos relatórios: cabeçalho com filtros, métricas e tabelas
export function generateReportPdf(report: ReportExport, generatedAt = new Date()) {
    const doc = new jsPDF({ orientation: report.orientation ?? "portrait", unit: "pt", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setFontSize(16)
    doc.text(report.title, MARGIN, 40)

    doc.setFontSize(9)
    let y = 56

    if (report.tenantName) {
        doc.text(report.tenantName, MARGIN, y)
        y += 14
    }

    doc.text(`Emitido em: ${generatedAt.toLocaleString("pt-BR")}`, pageWidth - MARGIN, 56, { align: "right" })

    for (const filter of report.filters) {
        const lines = doc.splitTextToSize(`${filter.label}: ${filter.value}`, pageWidth - MARGIN * 2 - 160) as string[]
        doc.text(lines, MARGIN, y)
        y += 12 * lines.length
    }

    y += 6

    if (report.metrics && report.metrics.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [report.metrics.map((metric) => metric.label)],
            body: [report.metrics.map((metric) => metric.value)],
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [235, 235, 235], textColor: 60, fontStyle: "normal" },
            bodyStyles: { fontStyle: "bold" },
            margin: { left: MARGIN, right: MARGIN },
        })
        y = lastTableY(doc, y) + 16
    }

    for (const table of report.tables) {
        if (y > pageHeight - 80) {
            doc.addPage()
            y = 40
        }

        if (table.title) {
            doc.setFontSize(11)
            doc.text(table.title, MARGIN, y)
            doc.setFontSize(9)
            y += 8
        }

        if (table.rows.length === 0) {
            doc.setTextColor(110)
            doc.text(table.empty ?? "sem dados para exibir", MARGIN, y + 10)
            doc.setTextColor(0)
            y += 30
            continue
        }

        const columnStyles: Record<number, { halign?: "left" | "center" | "right", cellWidth?: number }> = {}

        for (const [index, align] of Object.entries(table.align ?? {})) {
            columnStyles[Number(index)] = { ...columnStyles[Number(index)], halign: align }
        }
        for (const [index, width] of Object.entries(table.widths ?? {})) {
            columnStyles[Number(index)] = { ...columnStyles[Number(index)], cellWidth: width }
        }

        autoTable(doc, {
            startY: y,
            head: [table.head],
            body: table.rows,
            styles: { fontSize: 8, cellPadding: 4, valign: "top" },
            headStyles: { fillColor: HEAD_COLOR, textColor: 255 },
            alternateRowStyles: { fillColor: STRIPE_COLOR },
            columnStyles,
            margin: { left: MARGIN, right: MARGIN },
        })
        y = lastTableY(doc, y) + 22
    }

    if (report.notes && report.notes.length > 0) {
        doc.setFontSize(8)
        doc.setTextColor(110)

        for (const note of report.notes) {
            if (y > pageHeight - 40) {
                doc.addPage()
                y = 40
            }
            const lines = doc.splitTextToSize(note, pageWidth - MARGIN * 2) as string[]
            doc.text(lines, MARGIN, y)
            y += 11 * lines.length
        }

        doc.setTextColor(0)
    }

    const pageCount = doc.getNumberOfPages()

    for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page)
        doc.setFontSize(8)
        doc.text(`${page} / ${pageCount}`, pageWidth - MARGIN, pageHeight - 16, { align: "right" })
    }

    doc.save(`${report.fileName}.pdf`)
}

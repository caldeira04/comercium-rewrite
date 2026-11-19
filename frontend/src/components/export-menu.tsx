import { useState } from "react"
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getApiErrorMessage } from "@/lib/api-error"
import { downloadCsv } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"

type ExportMenuProps = {
    /** Monta o relatório; devolva `null` quando não houver o que exportar. */
    build: () => ReportExport | null | Promise<ReportExport | null>
    /** PDF próprio da tela (substitui o PDF padrão gerado a partir de `build`). */
    onPdf?: () => void | Promise<void>
    disabled?: boolean
    label?: string
    variant?: "default" | "outline"
    size?: "default" | "sm"
}

/** Botão "exportar" com as opções PDF e CSV, usado em todos os relatórios. */
export function ExportMenu({ build, onPdf, disabled, label = "exportar", variant = "default", size = "default" }: ExportMenuProps) {
    const [pending, setPending] = useState(false)

    async function handleExport(format: "pdf" | "csv") {
        setPending(true)

        try {
            if (format === "pdf" && onPdf) {
                await onPdf()
                return
            }

            const report = await build()

            if (!report) {
                toast.info("nada para exportar com os filtros selecionados")
                return
            }

            if (format === "csv") {
                downloadCsv(report.fileName, report.csv.headers, report.csv.rows)
            } else {
                const { generateReportPdf } = await import("@/lib/export/report-pdf")
                generateReportPdf(report)
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao exportar"))
        } finally {
            setPending(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size} disabled={disabled || pending}>
                    <DownloadIcon />
                    {pending ? "gerando..." : label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void handleExport("pdf")}>
                    <FileTextIcon />
                    PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleExport("csv")}>
                    <FileSpreadsheetIcon />
                    CSV (Excel)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

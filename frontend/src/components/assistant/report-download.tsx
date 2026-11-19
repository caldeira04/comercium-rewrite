import { useState } from "react"
import { FileDownIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { periodExportInfo, useSelectedCash } from "@/components/report-filters"
import type { AssistantDownload } from "@/hooks/use-assistant"
import { useTenantName } from "@/hooks/use-tenant-name"
import { useFormatDateTime } from "@/hooks/use-tenant-timezone"
import { getApiErrorMessage } from "@/lib/api-error"

// Botão do relatório gerado pelo assistente: busca os dados com os filtros
// escolhidos e gera o mesmo PDF ou CSV das telas
export function ReportDownload({ download }: { download: AssistantDownload }) {
    const [isPending, setIsPending] = useState(false)
    const tenantName = useTenantName()
    const formatDateTime = useFormatDateTime()
    const cashId = download.filters.cashId ?? "all"
    const selectedCash = useSelectedCash(cashId)
    const formatLabel = download.format === "csv" ? "CSV" : "PDF"

    async function handleDownload() {
        setIsPending(true)

        try {
            const period = periodExportInfo({
                startDate: download.filters.startDate ?? "",
                endDate: download.filters.endDate ?? "",
                cashId,
            }, selectedCash)

            const { exportAssistantReport } = await import("@/lib/reports/assistant")
            const result = await exportAssistantReport(download, {
                tenantName,
                formatDateTime,
                period,
                cashLabel: selectedCash.label,
            })

            if (!result.ok) {
                toast.info("nada para exportar com esses filtros")
            } else if (result.truncated) {
                toast.warning("a exportação foi limitada a 5.000 lançamentos; reduza o período para exportar tudo")
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, `erro ao gerar ${formatLabel}`))
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => void handleDownload()}>
            <FileDownIcon />
            {isPending ? `Gerando ${formatLabel}…` : `Baixar ${formatLabel}: ${download.title}`}
        </Button>
    )
}

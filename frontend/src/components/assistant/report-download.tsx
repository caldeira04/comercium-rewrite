import { FileDownIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { AssistantDownload } from "@/hooks/use-assistant"
import { useExportPayables } from "@/hooks/use-payables"
import { useExportReceivables } from "@/hooks/use-receivables"
import { getApiErrorMessage } from "@/lib/api-error"

// Gera o mesmo PDF das telas de contas a pagar e a receber, com os filtros
// escolhidos pelo assistente
export function ReportDownload({ download }: { download: AssistantDownload }) {
    const exportPayables = useExportPayables()
    const exportReceivables = useExportReceivables()
    const isPending = exportPayables.isPending || exportReceivables.isPending

    async function handleDownload() {
        const { startDate, endDate, status, payeeId } = download.filters

        try {
            if (download.kind === "payables_pdf") {
                const result = await exportPayables.mutateAsync({
                    startDate,
                    endDate,
                    status: status as Parameters<typeof exportPayables.mutateAsync>[0]["status"],
                    payeeId,
                })
                if (!result || result.rows.length === 0) {
                    toast.info("nenhum lançamento para exportar")
                    return
                }

                const { generatePayablesPdf } = await import("@/lib/payables-pdf")
                generatePayablesPdf({
                    tenantName: result.tenantName,
                    startDate,
                    endDate,
                    statusLabel: download.labels.status,
                    payeeLabel: download.labels.payee ?? "todos",
                    bankAccountLabel: "todas",
                    rows: result.rows,
                    summary: result.summary,
                    truncated: result.truncated,
                })

                if (result.truncated) {
                    toast.warning("o PDF foi limitado a 5.000 lançamentos; reduza o período para exportar tudo")
                }
                return
            }

            const result = await exportReceivables.mutateAsync({
                startDate,
                endDate,
                status: status as Parameters<typeof exportReceivables.mutateAsync>[0]["status"],
            })
            if (!result || result.rows.length === 0) {
                toast.info("nenhum lançamento para exportar")
                return
            }

            const { generateReceivablesPdf } = await import("@/lib/receivables-pdf")
            generateReceivablesPdf({
                tenantName: result.tenantName,
                startDate,
                endDate,
                statusLabel: download.labels.status,
                clientLabel: "todos",
                timeZone: result.timeZone,
                rows: result.rows,
                summary: result.summary,
            })

            if (result.truncated) {
                toast.warning("o PDF foi limitado a 5.000 lançamentos; reduza o período para exportar tudo")
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao exportar PDF"))
        }
    }

    return (
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => void handleDownload()}>
            <FileDownIcon />
            {isPending ? "Gerando PDF…" : `Baixar PDF: ${download.title}`}
        </Button>
    )
}

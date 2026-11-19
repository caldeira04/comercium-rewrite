import type { ReportExport } from "@/lib/export/types"

export type FormatDateTime = (value: string | null | undefined) => { date: string, time: string }

/** Contexto comum para montar um relatório exportável (telas e assistente). */
export type ReportContext = {
    tenantName: string
    formatDateTime: FormatDateTime
    /** Linhas de filtro do cabeçalho (período ou caixa primeiro). */
    filters: ReportExport["filters"]
    /** Sufixo do nome do arquivo (período ou caixa). */
    fileSuffix: string
}

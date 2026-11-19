import type { CsvCell } from "./csv"

export type ReportTable = {
    title?: string
    head: string[]
    rows: string[][]
    /** Alinhamento por índice de coluna (padrão: esquerda). */
    align?: Record<number, "left" | "center" | "right">
    /** Largura fixa (pt) por índice de coluna. */
    widths?: Record<number, number>
    /** Texto exibido quando a tabela não tem linhas. */
    empty?: string
}

/** Conteúdo de um relatório exportável; o mesmo objeto gera o PDF e o CSV. */
export type ReportExport = {
    title: string
    /** Nome do arquivo, sem extensão. */
    fileName: string
    tenantName?: string
    filters: Array<{ label: string, value: string }>
    metrics?: Array<{ label: string, value: string }>
    tables: ReportTable[]
    notes?: string[]
    orientation?: "portrait" | "landscape"
    csv: {
        headers: string[]
        rows: CsvCell[][]
    }
}

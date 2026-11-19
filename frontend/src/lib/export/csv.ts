export type CsvCell = string | number | null | undefined

// Excel em pt-BR espera ";" como separador e vírgula decimal
const SEPARATOR = ";"
const LINE_BREAK = "\r\n"

export function escapeCsvCell(value: CsvCell): string {
    if (value === null || value === undefined) return ""

    let text = typeof value === "number" ? String(value).replace(".", ",") : value

    // Evita que planilhas interpretem textos digitados pelo usuário como fórmula
    if (typeof value === "string" && /^[=+@\t\r]/.test(text)) text = `'${text}`

    if (/[";\r\n]/.test(text) || text !== text.trim()) {
        return `"${text.replace(/"/g, "\"\"")}"`
    }

    return text
}

export function buildCsv(headers: string[], rows: CsvCell[][]) {
    return [headers, ...rows]
        .map((row) => row.map(escapeCsvCell).join(SEPARATOR))
        .join(LINE_BREAK)
}

/** Valor em centavos como número decimal pt-BR, sem símbolo ("1234,50"). */
export function csvMoney(cents: number | null | undefined) {
    if (cents === null || cents === undefined) return ""

    return (cents / 100).toFixed(2).replace(".", ",")
}

export function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(fileName: string, headers: string[], rows: CsvCell[][]) {
    // O BOM faz o Excel abrir o arquivo como UTF-8 (acentos corretos)
    const blob = new Blob([`﻿${buildCsv(headers, rows)}`], { type: "text/csv;charset=utf-8" })

    downloadBlob(blob, fileName.endsWith(".csv") ? fileName : `${fileName}.csv`)
}

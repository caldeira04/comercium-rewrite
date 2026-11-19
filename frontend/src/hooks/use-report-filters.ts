import { useNavigate, useSearch } from "@tanstack/react-router"

type FilterValues = Record<string, string>

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_KEYS = new Set(["startDate", "endDate"])

function readValue(key: string, raw: unknown, fallback: string) {
    if (raw === undefined || raw === null || raw === "") return fallback

    const value = String(raw)

    if (DATE_KEYS.has(key) && !DATE_PATTERN.test(value)) return fallback

    return value
}

/**
 * Estado dos filtros de um relatório, guardado na URL.
 *
 * - `defaults` define quais filtros existem e seus valores iniciais; só o que
 *   difere do padrão vai para a query string, então o link fica limpo e
 *   sobrevive a recarregar/compartilhar.
 * - Mudar qualquer filtro volta para a página 1.
 * - Quando há `startDate`/`endDate`, `invalidRange` indica período invertido.
 */
export function useReportFilters<T extends FilterValues>(defaults: T) {
    const search: Record<string, unknown> = useSearch({ strict: false })
    const navigate = useNavigate()

    const filters = Object.fromEntries(
        Object.keys(defaults).map((key) => [key, readValue(key, search[key], defaults[key])]),
    ) as T

    const rawPage = Number(search.page)
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1

    function write(next: T, nextPage: number) {
        const params: Record<string, string | number> = {}

        for (const key of Object.keys(defaults)) {
            if (next[key] !== defaults[key]) params[key] = next[key]
        }
        if (nextPage > 1) params.page = nextPage

        void navigate({ to: ".", search: params as never, replace: true })
    }

    return {
        filters,
        page,
        invalidRange: Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate),
        setFilters: (patch: Partial<T>) => write({ ...filters, ...patch }, 1),
        setFilter: <TKey extends keyof T>(key: TKey, value: T[TKey]) => write({ ...filters, [key]: value }, 1),
        setPage: (nextPage: number) => write(filters, nextPage),
        reset: () => write(defaults, 1),
    }
}

/** Converte o valor de um select ("all" | "none" | id) no filtro enviado à API. */
export function parseReferenceFilter(value: string): string | undefined {
    return value === "all" ? undefined : value
}

/**
 * Parte de período da query enviada à API: com um caixa selecionado, ele
 * substitui as datas.
 */
export function periodOrCash(filters: { startDate: string, endDate: string, cashId: string }) {
    return filters.cashId !== "all"
        ? { cashId: filters.cashId }
        : { startDate: filters.startDate, endDate: filters.endDate }
}

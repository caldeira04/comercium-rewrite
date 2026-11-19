import { t } from "elysia"
import { AppError } from "./errors"

// Pedaços de query string compartilhados pelas rotas de relatório. As datas
// são sempre dias locais do tenant no formato YYYY-MM-DD.
export const dateRangeQuery = {
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
}

export const requiredDateRangeQuery = {
    startDate: t.String(),
    endDate: t.String(),
}

// Filtro por caixa: quando informado, substitui o período nos relatórios.
export const cashIdQuery = {
    cashId: t.Optional(t.String()),
}

export function parseCashId(value?: string): string | undefined {
    if (!value || value === "all") return undefined

    if (!/^[0-9a-zA-Z-]{1,64}$/.test(value)) {
        throw new AppError("caixa inválido", 400, "INVALID_CASH")
    }

    return value
}

export function parseClientId(value?: string): number | "none" | undefined {
    if (!value || value === "all") return undefined
    if (value === "none") return "none"

    const clientId = Number(value)

    if (!Number.isInteger(clientId) || clientId < 0) {
        throw new AppError("cliente inválido", 400, "INVALID_CLIENT")
    }

    return clientId
}

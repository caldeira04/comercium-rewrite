
export const formatTime = (time: Date) => {
    return {
        ddMMyy: time.toLocaleDateString("pt-BR").split("T")[0],
        hhMMss: time.toLocaleTimeString("pt-BR").split("T")[0],
        hhMM: time.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        }).split("T")[0],
    }
}

export function todayInputValue(date = new Date()) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
}

export function monthStartInputValue(date = new Date()) {
    return todayInputValue(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function monthEndInputValue(date = new Date()) {
    return todayInputValue(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function parseSqliteUtc(value: string) {
    return new Date(`${value.replace(" ", "T")}Z`)
}

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo"

// Dia corrente (YYYY-MM-DD) em um fuso específico, independente do navegador.
export function todayInTimeZone(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(now)
    const values = new Map(parts.map((part) => [part.type, part.value]))

    return `${values.get("year")}-${values.get("month")}-${values.get("day")}`
}

export function monthRangeInTimeZone(timeZone = DEFAULT_TIME_ZONE, now = new Date()) {
    const [year, month] = todayInTimeZone(timeZone, now).split("-").map(Number)
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const prefix = `${year}-${String(month).padStart(2, "0")}`

    return {
        monthStart: `${prefix}-01`,
        monthEnd: `${prefix}-${String(lastDay).padStart(2, "0")}`,
    }
}

// Timestamps do banco vêm como "YYYY-MM-DD HH:MM:SS" em UTC (CURRENT_TIMESTAMP
// do SQLite); `new Date(value)` puro interpretaria como horário local. Use
// `useFormatDateTime` nas telas para formatar no fuso do tenant.
export function formatDateTimeInZone(value: string | null, timeZone = DEFAULT_TIME_ZONE) {
    if (!value) return { date: "-", time: "" }

    const parsed = parseSqliteUtc(value)

    if (Number.isNaN(parsed.getTime())) return { date: "-", time: "" }

    return {
        date: new Intl.DateTimeFormat("pt-BR", {
            timeZone,
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(parsed),
        time: new Intl.DateTimeFormat("pt-BR", {
            timeZone,
            hour: "2-digit",
            minute: "2-digit",
        }).format(parsed),
    }
}

export function formatDateInput(value: string) {
    const [year, month, day] = value.split("-")

    return `${day}/${month}/${year}`
}

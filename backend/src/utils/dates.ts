const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const FALLBACK_TIME_ZONE = "America/Sao_Paulo"

export function normalizeTimeZone(timeZone?: string | null) {
    if (!timeZone) return FALLBACK_TIME_ZONE

    try {
        new Intl.DateTimeFormat("en-US", { timeZone })
        return timeZone
    } catch {
        return FALLBACK_TIME_ZONE
    }
}

export function isValidDateInput(value: string) {
    if (!DATE_PATTERN.test(value)) return false

    const [year, month, day] = value.split("-").map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))

    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day
}

function pad(value: number) {
    return String(value).padStart(2, "0")
}

function addDays(date: string, days: number) {
    const [year, month, day] = date.split("-").map(Number)
    const next = new Date(Date.UTC(year, month - 1, day + days))

    return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

function timeZoneOffsetMs(instant: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(instant)

    const values = new Map(parts.map((part) => [part.type, Number(part.value)]))
    const wallClockAsUtc = Date.UTC(
        values.get("year") ?? 0,
        (values.get("month") ?? 1) - 1,
        values.get("day") ?? 1,
        (values.get("hour") ?? 0) % 24,
        values.get("minute") ?? 0,
        values.get("second") ?? 0,
    )

    return wallClockAsUtc - instant.getTime()
}

function localMidnightToUtc(date: string, timeZone: string) {
    const [year, month, day] = date.split("-").map(Number)
    const utcMidnight = Date.UTC(year, month - 1, day)

    // Primeiro estima o offset no instante UTC e recalcula no instante
    // ajustado, cobrindo transições de horário de verão.
    const firstGuess = new Date(utcMidnight - timeZoneOffsetMs(new Date(utcMidnight), timeZone))
    const offset = timeZoneOffsetMs(firstGuess, timeZone)

    return new Date(utcMidnight - offset)
}

function toSqliteUtc(date: Date) {
    return date.toISOString().slice(0, 19).replace("T", " ")
}

export function localDateRangeToUtc(startDate: string, endDate: string, timeZone?: string | null) {
    const zone = normalizeTimeZone(timeZone)

    return {
        startUtc: toSqliteUtc(localMidnightToUtc(startDate, zone)),
        endExclusiveUtc: toSqliteUtc(localMidnightToUtc(addDays(endDate, 1), zone)),
    }
}

export function todayInTimeZone(timeZone?: string | null) {
    const zone = normalizeTimeZone(timeZone)
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date())

    const values = new Map(parts.map((part) => [part.type, part.value]))

    return `${values.get("year")}-${values.get("month")}-${values.get("day")}`
}

export function addMonthsClamped(date: string, months: number) {
    const [year, month, day] = date.split("-").map(Number)
    const target = new Date(Date.UTC(year, month - 1 + months, 1))
    const targetYear = target.getUTCFullYear()
    const targetMonth = target.getUTCMonth()
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
    const clampedDay = Math.min(day, lastDay)

    return `${targetYear}-${pad(targetMonth + 1)}-${pad(clampedDay)}`
}

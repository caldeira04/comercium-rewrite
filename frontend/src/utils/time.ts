
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

export function formatDateTimeInZone(value: string | null, timeZone = "America/Sao_Paulo") {
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

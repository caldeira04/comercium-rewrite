import { describe, expect, it } from "vitest"
import {
    formatDateTimeInZone,
    formatTime,
    monthEndInputValue,
    monthRangeInTimeZone,
    monthStartInputValue,
    todayInTimeZone,
} from "@/utils/time"

describe("formatTime", () => {
    it("returns pt-BR date components", () => {
        const time = new Date("2026-08-14T15:30:00")
        const formatted = formatTime(time)

        expect(formatted.ddMMyy).toBe("14/08/2026")
        expect(formatted.hhMM).toBe("15:30")
        expect(formatted.hhMMss).toBe("15:30:00")
    })
})

describe("month input values", () => {
    it("returns the first and last day of the month", () => {
        expect(monthStartInputValue(new Date("2026-02-14T15:30:00"))).toBe("2026-02-01")
        expect(monthEndInputValue(new Date("2026-02-14T15:30:00"))).toBe("2026-02-28")
        expect(monthEndInputValue(new Date("2028-02-14T15:30:00"))).toBe("2028-02-29")
        expect(monthEndInputValue(new Date("2026-12-31T23:00:00"))).toBe("2026-12-31")
    })
})

describe("tenant time zone helpers", () => {
    it("formats database timestamps (UTC) in the given zone", () => {
        // 00:30 UTC do dia 17 ainda é 21:30 do dia 16 em São Paulo
        expect(formatDateTimeInZone("2026-11-17 00:30:00", "America/Sao_Paulo")).toEqual({
            date: "16/11/2026",
            time: "21:30",
        })
        expect(formatDateTimeInZone("2026-11-17 00:30:00", "UTC").date).toBe("17/11/2026")
        expect(formatDateTimeInZone(null)).toEqual({ date: "-", time: "" })
    })

    it("resolves today and the current month in the given zone", () => {
        const now = new Date("2026-12-01T01:00:00Z")

        expect(todayInTimeZone("America/Sao_Paulo", now)).toBe("2026-11-30")
        expect(todayInTimeZone("UTC", now)).toBe("2026-12-01")
        expect(monthRangeInTimeZone("America/Sao_Paulo", now)).toEqual({
            monthStart: "2026-11-01",
            monthEnd: "2026-11-30",
        })
        expect(monthRangeInTimeZone("UTC", new Date("2028-02-10T12:00:00Z")).monthEnd).toBe("2028-02-29")
    })
})

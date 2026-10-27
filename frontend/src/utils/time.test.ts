import { describe, expect, it } from "vitest"
import { formatTime, monthEndInputValue, monthStartInputValue } from "@/utils/time"

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

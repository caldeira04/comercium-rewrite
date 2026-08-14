import { describe, expect, it } from "vitest"
import { formatTime } from "@/utils/time"

describe("formatTime", () => {
    it("returns pt-BR date components", () => {
        const time = new Date("2026-08-14T15:30:00")
        const formatted = formatTime(time)

        expect(formatted.ddMMyy).toBe("14/08/2026")
        expect(formatted.hhMM).toBe("15:30")
        expect(formatted.hhMMss).toBe("15:30:00")
    })
})
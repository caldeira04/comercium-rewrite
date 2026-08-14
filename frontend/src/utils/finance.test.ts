import { describe, expect, it } from "vitest"
import { formatCurrency, maskCurrency, translatePaymentMethod } from "@/utils/finance"

describe("formatCurrency", () => {
    it("formats cents as BRL currency", () => {
        expect(formatCurrency(1234)).toBe("R$ 12,34")
    })

    it("formats zero", () => {
        expect(formatCurrency(0)).toBe("R$ 0,00")
    })

    it("handles large values without thousand separators", () => {
        expect(formatCurrency(123456789)).toBe("R$ 1234567,89")
    })
})

describe("maskCurrency", () => {
    it("converts digits-only input to BRL currency", () => {
        expect(maskCurrency("1234")).toBe("R$\u00A012,34")
    })

    it("strips non-digit characters", () => {
        expect(maskCurrency("R$ 1.234")).toBe("R$\u00A012,34")
    })

    it("handles empty input", () => {
        expect(maskCurrency("")).toBe("R$\u00A00,00")
    })
})

describe("translatePaymentMethod", () => {
    it("maps all payment methods to Portuguese", () => {
        expect(translatePaymentMethod("cash")).toBe("dinheiro")
        expect(translatePaymentMethod("debit")).toBe("débito")
        expect(translatePaymentMethod("credit")).toBe("crédito")
        expect(translatePaymentMethod("pix")).toBe("PIX")
        expect(translatePaymentMethod("voucher")).toBe("cheque")
    })
})
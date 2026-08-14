import { describe, expect, it } from "vitest"
import { formatCashMovementNature, formatCashMovementType, formatPaymentMethod } from "@/utils/formatters"

describe("formatCashMovementNature", () => {
    it("maps in/out to Portuguese", () => {
        expect(formatCashMovementNature({ nature: "in" })).toBe("entrada")
        expect(formatCashMovementNature({ nature: "out" })).toBe("saída")
    })
})

describe("formatCashMovementType", () => {
    it("maps all movement types to Portuguese", () => {
        expect(formatCashMovementType({ type: "payment" })).toBe("pagamento")
        expect(formatCashMovementType({ type: "drop" })).toBe("sangria")
        expect(formatCashMovementType({ type: "topup" })).toBe("suprimento")
        expect(formatCashMovementType({ type: "open" })).toBe("abertura")
        expect(formatCashMovementType({ type: "refund" })).toBe("estorno")
    })
})

describe("formatPaymentMethod", () => {
    it("maps all payment methods to Portuguese", () => {
        expect(formatPaymentMethod({ method: "cash" })).toBe("dinheiro")
        expect(formatPaymentMethod({ method: "pix" })).toBe("PIX")
        expect(formatPaymentMethod({ method: "debit" })).toBe("débito")
        expect(formatPaymentMethod({ method: "credit" })).toBe("crédito")
        expect(formatPaymentMethod({ method: "voucher" })).toBe("cheque")
    })
})
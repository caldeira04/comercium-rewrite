import { describe, expect, it } from "vitest"
import type { SaleListItem } from "@/lib/api-types"
import { buildSalesHistoryExport, salePaidAmount, saleProductsCell } from "./sales-history"

const sale = {
    id: "uuid-1",
    number: 152,
    cashId: "c1",
    createdAt: "2026-11-18 15:00:00",
    settledAt: "2026-11-18 15:05:00",
    totalAmount: 1600,
    client: { id: 1, name: "Maria" },
    cash: { id: "c1", number: 34 },
    payment: [
        { id: "p1", amount: 1000, status: "paid", paymentMethod: "pix", paidAt: "2026-11-18 15:05:00" },
        { id: "p2", amount: 600, status: "refunded", paymentMethod: "cash", paidAt: "2026-11-18 15:05:00" },
    ],
    saleItem: [
        { quantity: 2, unitPrice: 600, discount: null, totalPrice: 1200, product: { id: 10, name: "Coca 350ml" } },
        { quantity: 4, unitPrice: 100, discount: null, totalPrice: 400, product: { id: 11, name: "Pão" } },
    ],
} as unknown as SaleListItem

describe("sales history export", () => {
    it("lista um produto por linha na mesma célula", () => {
        expect(saleProductsCell(sale)).toBe("2× Coca 350ml — R$ 12,00\n4× Pão — R$ 4,00")
    })

    it("soma o mesmo produto lançado em linhas separadas", () => {
        const repeated = {
            ...sale,
            saleItem: [
                ...sale.saleItem,
                { quantity: 1, unitPrice: 600, discount: null, totalPrice: 600, product: { id: 10, name: "Coca 350ml" } },
            ],
        } as unknown as SaleListItem

        expect(saleProductsCell(repeated)).toBe("3× Coca 350ml — R$ 18,00\n4× Pão — R$ 4,00")
    })

    it("não conta pagamentos estornados como pagos", () => {
        expect(salePaidAmount(sale)).toBe(1000)
    })

    it("monta a linha do CSV com número, caixa e produtos", () => {
        const report = buildSalesHistoryExport([sale], {
            tenantName: "Loja",
            filters: [],
            fileSuffix: "teste",
            formatDateTime: () => ({ date: "18/11/2026", time: "12:00" }),
        })

        expect(report.csv.headers).toContain("produtos")
        expect(report.csv.rows[0]).toEqual([
            152, "18/11/2026", "12:00", "Maria", 34,
            "2× Coca 350ml — R$ 12,00\n4× Pão — R$ 4,00",
            6, "16,00", "10,00", "6,00", "PIX", "quitada",
        ])
        expect(report.tables[0].rows[0][4]).toContain("\n")
    })
})

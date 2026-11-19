import { describe, expect, it } from "vitest"
import type { Sales, StockReportProduct } from "@/lib/api-types"
import { buildSalesReportExport, getTopProducts, summarizeSales } from "./sales-report"
import { buildStockReportExport, matchesStockFilters, summarizeStock } from "./stock"

const context = {
    tenantName: "Loja",
    formatDateTime: () => ({ date: "18/11/2026", time: "12:00" }),
    filters: [{ label: "Período", value: "01/11/2026 a 30/11/2026" }],
    fileSuffix: "2026-11-01_2026-11-30",
}

const sales = [
    {
        totalAmount: 1600,
        client: { id: 1, name: "Maria" },
        payment: [{ amount: 1600, status: "paid" }],
        saleItem: [
            { quantity: 2, totalPrice: 1200, discount: 200, product: { id: 10, name: "Coca", buyPrice: 300 } },
            { quantity: 4, totalPrice: 400, product: { id: 11, name: "Pão", buyPrice: 50 } },
        ],
    },
    {
        totalAmount: 900,
        client: null,
        payment: [{ amount: 900, status: "refunded" }],
        saleItem: [
            { quantity: 1, totalPrice: 600, product: { id: 10, name: "Coca", buyPrice: 300 } },
            { quantity: 1, totalPrice: 300, product: { id: 0, name: "Avulso", buyPrice: 0 } },
        ],
    },
] as unknown as NonNullable<Sales>

function product(overrides: Partial<StockReportProduct>): StockReportProduct {
    return {
        id: 1, name: "Produto", buyPrice: 100, sellPrice: 200, category: null,
        opening: 0, inflow: 0, outflow: 0, adjustments: 0, adjustmentDelta: 0, closing: 0,
        ...overrides,
    } as StockReportProduct
}

describe("relatório de vendas", () => {
    it("soma produtos com lucro e ignora pagamentos estornados no total pago", () => {
        expect(getTopProducts(sales)).toEqual([
            { name: "Coca", quantity: 3, amount: 1600, profit: 700 },
            { name: "Pão", quantity: 4, amount: 400, profit: 200 },
            { name: "Avulso", quantity: 1, amount: 300, profit: null },
        ])
        expect(summarizeSales(sales)).toEqual({ count: 2, totalProfit: 900, totalSold: 2500, totalPaid: 1600, averageTicket: 1250 })
    })

    it("o CSV traz o ranking completo com participação", () => {
        const report = buildSalesReportExport(sales, context)

        expect(report.fileName).toBe("relatorio-de-vendas_2026-11-01_2026-11-30")
        expect(report.filters).toEqual(context.filters)
        expect(report.csv.rows[0]).toEqual(["Coca", 3, "7,00", "16,00", 64])
        expect(report.csv.rows[2]).toEqual(["Avulso", 1, "", "3,00", 12])
    })
})

describe("relatório de estoque", () => {
    const products = [
        product({ id: 1, name: "A", closing: 5, inflow: 5, category: { id: 7, name: "Bebidas" } }),
        product({ id: 2, name: "B", closing: 0, outflow: 2, opening: 2 }),
        product({ id: 3, name: "C", closing: 3, buyPrice: 300, sellPrice: 200 }),
    ]

    it("filtra por categoria e por saldo final", () => {
        expect(products.filter((entry) => matchesStockFilters(entry, { categoryId: "7", stock: "all" })).map((entry) => entry.id)).toEqual([1])
        expect(products.filter((entry) => matchesStockFilters(entry, { categoryId: "none", stock: "all" })).map((entry) => entry.id)).toEqual([2, 3])
        expect(products.filter((entry) => matchesStockFilters(entry, { categoryId: "all", stock: "empty" })).map((entry) => entry.id)).toEqual([2])
    })

    it("resume movimentação, valores e alertas", () => {
        const summary = summarizeStock(products)

        expect(summary).toMatchObject({ unitsIn: 5, unitsOut: 2, stockValue: 1400, saleValue: 1600 })
        expect(summary.moved.map((entry) => entry.id)).toEqual([1, 2])
        expect(summary.zeroStock.map((entry) => entry.id)).toEqual([2])
        expect(summary.negativeMargin.map((entry) => entry.id)).toEqual([3])
        expect(buildStockReportExport(products, context).notes?.[0]).toContain("preços atuais")
    })
})

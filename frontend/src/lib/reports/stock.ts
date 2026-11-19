import type { StockReportProduct } from "@/lib/api-types"
import { csvMoney } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { formatCurrency } from "@/utils/finance"
import type { ReportContext } from "./types"

export const STOCK_PRICE_NOTE = "custos e valores de venda calculados com os preços atuais dos produtos"

export type StockFilters = { categoryId: string, stock: string }

export function matchesStockFilters(product: StockReportProduct, filters: StockFilters) {
    if (filters.categoryId === "none" && product.category) return false
    if (filters.categoryId !== "all" && filters.categoryId !== "none"
        && String(product.category?.id) !== filters.categoryId) return false

    if (filters.stock === "available" && product.closing <= 0) return false
    if (filters.stock === "empty" && product.closing > 0) return false

    return true
}

/** Indicadores e listas do relatório de estoque, sobre os produtos já filtrados. */
export function summarizeStock(products: StockReportProduct[]) {
    const stockValue = products.reduce((total, product) => total + Math.max(product.closing, 0) * product.buyPrice, 0)
    const saleValue = products.reduce((total, product) => total + Math.max(product.closing, 0) * product.sellPrice, 0)

    return {
        count: products.length,
        unitsIn: products.reduce((total, product) => total + product.inflow, 0),
        unitsOut: products.reduce((total, product) => total + product.outflow, 0),
        stockValue,
        saleValue,
        potentialProfit: saleValue - stockValue,
        moved: products.filter((product) => product.inflow > 0 || product.outflow > 0 || product.adjustments > 0),
        zeroStock: products.filter((product) => product.closing <= 0),
        negativeMargin: products.filter((product) => product.sellPrice < product.buyPrice),
    }
}

export function formatAdjustment(product: StockReportProduct) {
    if (product.adjustments === 0) return "-"

    return product.adjustmentDelta > 0 ? `+${product.adjustmentDelta}` : String(product.adjustmentDelta)
}

export function buildStockReportExport(products: StockReportProduct[], context: ReportContext): ReportExport {
    const summary = summarizeStock(products)

    return {
        title: "Relatório de estoque",
        fileName: `relatorio-de-estoque_${context.fileSuffix}`,
        tenantName: context.tenantName,
        orientation: "landscape",
        filters: context.filters,
        metrics: [
            { label: "produtos", value: String(summary.count) },
            { label: "entradas (un.)", value: String(summary.unitsIn) },
            { label: "saídas (un.)", value: String(summary.unitsOut) },
            { label: "custo em estoque", value: formatCurrency(summary.stockValue) },
            { label: "valor de venda", value: formatCurrency(summary.saleValue) },
            { label: "lucro potencial", value: formatCurrency(summary.potentialProfit) },
        ],
        tables: [
            {
                title: "Movimentação no período",
                head: ["produto", "categoria", "inicial", "entradas", "saídas", "ajustes", "final"],
                rows: summary.moved.map((product) => [
                    product.name,
                    product.category?.name ?? "-",
                    String(product.opening),
                    String(product.inflow),
                    String(product.outflow),
                    formatAdjustment(product),
                    String(product.closing),
                ]),
                align: { 2: "right", 3: "right", 4: "right", 5: "right", 6: "right" },
                empty: "nenhuma movimentação no período",
            },
            {
                title: "Produtos sem estoque",
                head: ["produto", "estoque", "margem"],
                rows: summary.zeroStock.map((product) => [product.name, String(product.closing), formatCurrency(product.sellPrice - product.buyPrice)]),
                align: { 1: "right", 2: "right" },
                empty: "nenhum produto sem estoque",
            },
            {
                title: "Margem negativa",
                head: ["produto", "estoque", "margem"],
                rows: summary.negativeMargin.map((product) => [product.name, String(product.closing), formatCurrency(product.sellPrice - product.buyPrice)]),
                align: { 1: "right", 2: "right" },
                empty: "nenhum produto com margem negativa",
            },
        ],
        notes: [STOCK_PRICE_NOTE],
        csv: {
            headers: ["produto", "categoria", "saldo inicial", "entradas", "saídas", "ajuste", "saldo final", "custo unitário", "preço de venda", "custo em estoque", "valor de venda"],
            rows: products.map((product) => [
                product.name,
                product.category?.name ?? "",
                product.opening,
                product.inflow,
                product.outflow,
                product.adjustments > 0 ? product.adjustmentDelta : "",
                product.closing,
                csvMoney(product.buyPrice),
                csvMoney(product.sellPrice),
                csvMoney(Math.max(product.closing, 0) * product.buyPrice),
                csvMoney(Math.max(product.closing, 0) * product.sellPrice),
            ]),
        },
    }
}

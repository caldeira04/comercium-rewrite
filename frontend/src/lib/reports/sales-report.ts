import type { Sales } from "@/lib/api-types"
import { csvMoney } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { formatCurrency } from "@/utils/finance"
import { salePaidAmount } from "./sales-history"
import type { ReportContext } from "./types"

type SaleRows = NonNullable<Sales>

export type RankingRow = { name: string, quantity: number, amount: number }

/** Produto "avulso" da venda rápida: não tem custo, então não entra no lucro. */
const GENERIC_PRODUCT_ID = 0

/** `profit` é null quando o custo é desconhecido (produto avulso). */
export type ProductRankingRow = RankingRow & { profit: number | null }

type SaleItemRow = SaleRows[number]["saleItem"][number]

function itemRevenue(item: SaleItemRow) {
    return item.totalPrice - (item.discount ?? 0)
}

/** Lucro bruto estimado pelo preço de custo atual do produto. */
function itemProfit(item: SaleItemRow) {
    if (item.product.id === GENERIC_PRODUCT_ID) return null
    return itemRevenue(item) - item.product.buyPrice * item.quantity
}

export function getTopProducts(sales: SaleRows) {
    const rows = new Map<number, ProductRankingRow>()

    sales.forEach((sale) => {
        sale.saleItem.forEach((item) => {
            const current = rows.get(item.product.id) ?? { name: item.product.name, quantity: 0, amount: 0, profit: 0 }
            const profit = itemProfit(item)
            rows.set(item.product.id, {
                ...current,
                quantity: current.quantity + item.quantity,
                amount: current.amount + itemRevenue(item),
                profit: current.profit === null || profit === null ? null : current.profit + profit,
            })
        })
    })

    return [...rows.values()].sort((a, b) => b.amount - a.amount)
}

export function getTopClients(sales: SaleRows) {
    const rows = new Map<string, RankingRow>()

    sales.forEach((sale) => {
        const name = sale.client?.name ?? "cliente não informado"
        const current = rows.get(name) ?? { name, quantity: 0, amount: 0 }
        rows.set(name, {
            ...current,
            quantity: current.quantity + 1,
            amount: current.amount + sale.totalAmount,
        })
    })

    return [...rows.values()].sort((a, b) => b.amount - a.amount)
}

export function summarizeSales(sales: SaleRows) {
    const totalSold = sales.reduce((total, sale) => total + sale.totalAmount, 0)
    const totalPaid = sales.reduce((total, sale) => total + salePaidAmount(sale), 0)
    const totalProfit = sales.reduce(
        (total, sale) => total + sale.saleItem.reduce((sum, item) => sum + (itemProfit(item) ?? 0), 0),
        0
    )

    return {
        count: sales.length,
        totalProfit,
        totalSold,
        totalPaid,
        averageTicket: sales.length ? totalSold / sales.length : 0,
    }
}

export function buildSalesReportExport(sales: SaleRows, context: ReportContext): ReportExport {
    const summary = summarizeSales(sales)
    const productRows = getTopProducts(sales)
    const clientRows = getTopClients(sales)
    const toRows = (rows: RankingRow[]) => rows.map((row) => [row.name, String(row.quantity), formatCurrency(row.amount)])
    const profitLabel = (profit: number | null) => (profit === null ? "—" : formatCurrency(profit))

    return {
        title: "Relatório de vendas",
        fileName: `relatorio-de-vendas_${context.fileSuffix}`,
        tenantName: context.tenantName,
        filters: context.filters,
        metrics: [
            { label: "vendas", value: String(summary.count) },
            { label: "lucro bruto", value: formatCurrency(summary.totalProfit) },
            { label: "total vendido", value: formatCurrency(summary.totalSold) },
            { label: "total pago", value: formatCurrency(summary.totalPaid) },
            { label: "ticket médio", value: formatCurrency(summary.averageTicket) },
        ],
        tables: [
            {
                title: "Produtos vendidos",
                head: ["produto", "qtd.", "lucro", "faturamento"],
                rows: productRows.map((row) => [row.name, String(row.quantity), profitLabel(row.profit), formatCurrency(row.amount)]),
                align: { 1: "right", 2: "right", 3: "right" },
            },
            { title: "Clientes", head: ["cliente", "compras", "total"], rows: toRows(clientRows), align: { 1: "right", 2: "right" } },
        ],
        notes: ["Lucro bruto estimado pelo preço de custo atual dos produtos; itens avulsos não entram no lucro."],
        // O CSV traz o ranking completo de produtos, que é a tabela detalhada
        csv: {
            headers: ["produto", "quantidade", "lucro", "faturamento", "participação (%)"],
            rows: productRows.map((row) => [
                row.name,
                row.quantity,
                row.profit === null ? "" : csvMoney(row.profit),
                csvMoney(row.amount),
                summary.totalSold > 0 ? Number(((row.amount / summary.totalSold) * 100).toFixed(2)) : 0,
            ]),
        },
    }
}

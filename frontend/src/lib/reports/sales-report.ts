import type { Sales } from "@/lib/api-types"
import { csvMoney } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { formatCurrency } from "@/utils/finance"
import { salePaidAmount } from "./sales-history"
import type { ReportContext } from "./types"

type SaleRows = NonNullable<Sales>

export type RankingRow = { name: string, quantity: number, amount: number }

export function getTopProducts(sales: SaleRows) {
    const rows = new Map<string, RankingRow>()

    sales.forEach((sale) => {
        sale.saleItem.forEach((item) => {
            const current = rows.get(item.product.name) ?? { name: item.product.name, quantity: 0, amount: 0 }
            rows.set(item.product.name, {
                ...current,
                quantity: current.quantity + item.quantity,
                amount: current.amount + item.totalPrice,
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

    return {
        count: sales.length,
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

    return {
        title: "Relatório de vendas",
        fileName: `relatorio-de-vendas_${context.fileSuffix}`,
        tenantName: context.tenantName,
        filters: context.filters,
        metrics: [
            { label: "vendas", value: String(summary.count) },
            { label: "total vendido", value: formatCurrency(summary.totalSold) },
            { label: "total pago", value: formatCurrency(summary.totalPaid) },
            { label: "ticket médio", value: formatCurrency(summary.averageTicket) },
        ],
        tables: [
            { title: "Produtos vendidos", head: ["produto", "qtd.", "faturamento"], rows: toRows(productRows), align: { 1: "right", 2: "right" } },
            { title: "Clientes", head: ["cliente", "compras", "total"], rows: toRows(clientRows), align: { 1: "right", 2: "right" } },
        ],
        // O CSV traz o ranking completo de produtos, que é a tabela detalhada
        csv: {
            headers: ["produto", "quantidade", "faturamento", "participação (%)"],
            rows: productRows.map((row) => [
                row.name,
                row.quantity,
                csvMoney(row.amount),
                summary.totalSold > 0 ? Number(((row.amount / summary.totalSold) * 100).toFixed(2)) : 0,
            ]),
        },
    }
}

import type { SaleListItem } from "@/lib/api-types"
import { csvMoney } from "@/lib/export/csv"
import type { ReportExport } from "@/lib/export/types"
import { formatCurrency } from "@/utils/finance"
import { formatPaymentMethod, formatRecordNumber } from "@/utils/formatters"
import type { ReportContext } from "./types"

/** Total efetivamente pago (pagamentos estornados não contam). */
export function salePaidAmount(sale: Pick<SaleListItem, "payment">) {
    return sale.payment
        .filter((payment) => payment.status === "paid")
        .reduce((total, payment) => total + payment.amount, 0)
}

export function saleStatusLabel(sale: Pick<SaleListItem, "settledAt" | "totalAmount" | "payment">) {
    return sale.settledAt || sale.totalAmount - salePaidAmount(sale) <= 0 ? "quitada" : "pendente"
}

/** Itens do mesmo produto somados (a venda pode lançá-lo em várias linhas). */
export function groupSaleItems(items: SaleListItem["saleItem"]) {
    const grouped = new Map<number, { name: string, quantity: number, totalPrice: number }>()

    for (const item of items) {
        const current = grouped.get(item.product.id)

        if (current) {
            current.quantity += item.quantity
            current.totalPrice += item.totalPrice
        } else {
            grouped.set(item.product.id, { name: item.product.name, quantity: item.quantity, totalPrice: item.totalPrice })
        }
    }

    return [...grouped.values()]
}

/** Um produto por linha, dentro da mesma célula: "2× Coca 350ml — R$ 12,00". */
export function saleProductsCell(sale: Pick<SaleListItem, "saleItem">) {
    return groupSaleItems(sale.saleItem)
        .map((item) => `${item.quantity}× ${item.name} — ${formatCurrency(item.totalPrice)}`)
        .join("\n")
}

function salePaymentMethods(sale: Pick<SaleListItem, "payment">) {
    const methods = new Set(
        sale.payment
            .filter((payment) => payment.status === "paid")
            .map((payment) => formatPaymentMethod({ method: payment.paymentMethod })),
    )

    return [...methods].join(", ")
}

export function buildSalesHistoryExport(sales: SaleListItem[], context: ReportContext): ReportExport {
    const rows = sales.map((sale) => {
        const createdAt = context.formatDateTime(sale.createdAt)
        const paid = salePaidAmount(sale)

        return {
            sale,
            createdAt,
            paid,
            pending: Math.max(sale.totalAmount - paid, 0),
            cash: sale.cash ? formatRecordNumber(sale.cash.number) : "-",
            products: saleProductsCell(sale),
            methods: salePaymentMethods(sale),
            status: saleStatusLabel(sale),
        }
    })

    const total = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    const paid = rows.reduce((sum, row) => sum + row.paid, 0)

    return {
        title: "Histórico de vendas",
        fileName: `historico-de-vendas_${context.fileSuffix}`,
        tenantName: context.tenantName,
        filters: context.filters,
        orientation: "landscape",
        metrics: [
            { label: "vendas", value: String(sales.length) },
            { label: "total vendido", value: formatCurrency(total) },
            { label: "total pago", value: formatCurrency(paid) },
            { label: "pendente", value: formatCurrency(Math.max(total - paid, 0)) },
        ],
        tables: [{
            head: ["nº", "data", "cliente", "caixa", "produtos", "total", "pago", "formas", "situação"],
            rows: rows.map((row) => [
                String(row.sale.number),
                `${row.createdAt.date} ${row.createdAt.time}`,
                row.sale.client?.name ?? "não informado",
                row.cash,
                row.products || "-",
                formatCurrency(row.sale.totalAmount),
                formatCurrency(row.paid),
                row.methods || "-",
                row.status,
            ]),
            align: { 0: "right", 5: "right", 6: "right" },
            widths: { 0: 34, 1: 80, 2: 100, 3: 50, 4: 230, 5: 62, 6: 62 },
        }],
        csv: {
            headers: ["nº", "data", "hora", "cliente", "caixa", "produtos", "itens", "total", "pago", "pendente", "formas de pagamento", "situação"],
            rows: rows.map((row) => [
                row.sale.number,
                row.createdAt.date,
                row.createdAt.time,
                row.sale.client?.name ?? "não informado",
                row.sale.cash?.number ?? "",
                row.products,
                row.sale.saleItem.reduce((sum, item) => sum + item.quantity, 0),
                csvMoney(row.sale.totalAmount),
                csvMoney(row.paid),
                csvMoney(row.pending),
                row.methods,
                row.status,
            ]),
        },
    }
}

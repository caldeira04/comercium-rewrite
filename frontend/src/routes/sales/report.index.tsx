import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { useSalesList } from "@/hooks/use-sales"
import { useClients } from "@/hooks/use-clients"
import { useReportFilters } from "@/hooks/use-report-filters"
import { useTenantDates } from "@/hooks/use-tenant-timezone"
import { FilterSelect, ReportFilters, clientOptions } from "@/components/report-filters"
import type { Sales } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"

export const Route = createFileRoute("/sales/report/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { monthStart, monthEnd } = useTenantDates()
    const { filters, invalidRange, setFilter, setFilters, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        clientId: "all",
    })
    const { clients } = useClients()
    const salesQuery = useSalesList(filters, { enabled: !invalidRange })
    const sales = invalidRange ? undefined : salesQuery.data
    const totalSold = sales?.reduce((total, sale) => total + sale.totalAmount, 0) ?? 0
    const totalPaid = sales?.reduce((total, sale) => total + sale.payment.reduce((sum, payment) => sum + payment.amount, 0), 0) ?? 0
    const averageTicket = sales?.length ? totalSold / sales.length : 0
    const productRows = getTopProducts(sales ?? [])
    const clientRows = getTopClients(sales ?? [])

    return (
        <div className="flex min-h-screen w-full flex-col gap-4 self-start p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">relatório de vendas</h1>
                <p className="text-muted-foreground">resultado comercial do período</p>
            </div>
            <ReportFilters
                startDate={filters.startDate}
                endDate={filters.endDate}
                onPeriodChange={setFilters}
                invalidRange={invalidRange}
                onReset={reset}
            >
                <FilterSelect
                    label="cliente"
                    className="w-56"
                    value={filters.clientId}
                    onChange={(value) => setFilter("clientId", value)}
                    options={clientOptions(clients)}
                />
            </ReportFilters>
            {!invalidRange && salesQuery.isPending && <Spinner />}
            {!invalidRange && salesQuery.isError && <span>ocorreu um erro ao buscar as vendas</span>}
            {sales && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        <Metric label="vendas" value={String(sales.length)} />
                        <Metric label="total vendido" value={formatCurrency(totalSold)} />
                        <Metric label="total pago" value={formatCurrency(totalPaid)} />
                        <Metric label="ticket médio" value={formatCurrency(averageTicket)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardContent>
                                <h2 className="mb-4 font-bold">produtos mais vendidos</h2>
                                <ReportTable rows={productRows} amountLabel="faturamento" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent>
                                <h2 className="mb-4 font-bold">clientes com maior compra</h2>
                                <ReportTable rows={clientRows} amountLabel="total" />
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}

function Metric({ label, value }: { label: string, value: string }) {
    return (
        <Card>
            <CardContent>
                <p className="text-sm uppercase text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </CardContent>
        </Card>
    )
}

function ReportTable({ rows, amountLabel }: { rows: Array<{ name: string, quantity: number, amount: number }>, amountLabel: string }) {
    if (rows.length === 0) return <p className="text-muted-foreground">sem dados para exibir</p>

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>nome</TableHead>
                    <TableHead className="text-right">qtd.</TableHead>
                    <TableHead className="text-right">{amountLabel}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.slice(0, 10).map((row) => (
                    <TableRow key={row.name}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function getTopProducts(sales: NonNullable<Sales>) {
    const rows = new Map<string, { name: string, quantity: number, amount: number }>()

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

function getTopClients(sales: NonNullable<Sales>) {
    const rows = new Map<string, { name: string, quantity: number, amount: number }>()

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

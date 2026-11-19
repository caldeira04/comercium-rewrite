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
import { periodOrCash, useReportFilters } from "@/hooks/use-report-filters"
import { useFormatDateTime, useTenantDates } from "@/hooks/use-tenant-timezone"
import { useTenantName } from "@/hooks/use-tenant-name"
import {
    CASH_PERIOD_HINT,
    CashFilterSelect,
    FilterSelect,
    ReportFilters,
    clientOptions,
    optionLabel,
    periodExportInfo,
    useSelectedCash,
} from "@/components/report-filters"
import { ExportMenu } from "@/components/export-menu"
import type { ReportExport } from "@/lib/export/types"
import { buildSalesReportExport, getTopClients, getTopProducts, summarizeSales } from "@/lib/reports/sales-report"
import { formatCurrency } from "@/utils/finance"

export const Route = createFileRoute("/sales/report/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { monthStart, monthEnd } = useTenantDates()
    const { filters, invalidRange: invalidPeriod, setFilter, setFilters, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        clientId: "all",
        cashId: "all",
    })
    const hasCash = filters.cashId !== "all"
    const invalidRange = invalidPeriod && !hasCash
    const { clients } = useClients()
    const tenantName = useTenantName()
    const formatDateTime = useFormatDateTime()
    const selectedCash = useSelectedCash(filters.cashId)
    const clientFilterOptions = clientOptions(clients)
    const salesQuery = useSalesList({ ...periodOrCash(filters), clientId: filters.clientId }, { enabled: !invalidRange })
    const sales = invalidRange ? undefined : salesQuery.data
    const { totalProfit, totalSold, totalPaid, averageTicket } = summarizeSales(sales ?? [])
    const productRows = getTopProducts(sales ?? [])
    const clientRows = getTopClients(sales ?? [])

    function buildExport(): ReportExport | null {
        if (!sales || sales.length === 0) return null

        const period = periodExportInfo(filters, selectedCash)

        return buildSalesReportExport(sales, {
            tenantName,
            formatDateTime,
            fileSuffix: period.fileSuffix,
            filters: [period.filter, { label: "Cliente", value: optionLabel(clientFilterOptions, filters.clientId) }],
        })
    }

    return (
        <div className="flex w-full flex-col gap-4 self-start p-3 md:min-h-screen md:p-4">
            <div>
                <h1 className="text-xl font-bold uppercase md:text-2xl">relatório de vendas</h1>
                <p className="text-muted-foreground">resultado comercial do período</p>
            </div>
            <ReportFilters
                startDate={filters.startDate}
                endDate={filters.endDate}
                onPeriodChange={setFilters}
                invalidRange={invalidRange}
                periodDisabledHint={hasCash ? CASH_PERIOD_HINT : undefined}
                onReset={reset}
                actions={<ExportMenu build={buildExport} disabled={!sales || sales.length === 0} />}
            >
                <CashFilterSelect value={filters.cashId} onChange={(value) => setFilter("cashId", value)} />
                <FilterSelect
                    label="cliente"
                    className="sm:w-56"
                    value={filters.clientId}
                    onChange={(value) => setFilter("clientId", value)}
                    options={clientFilterOptions}
                />
            </ReportFilters>
            {!invalidRange && salesQuery.isPending && <Spinner />}
            {!invalidRange && salesQuery.isError && <span>ocorreu um erro ao buscar as vendas</span>}
            {sales && (
                <>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-5">
                        <Metric label="vendas" value={String(sales.length)} />
                        <Metric label="lucro bruto" value={formatCurrency(totalProfit)} />
                        <Metric label="total vendido" value={formatCurrency(totalSold)} />
                        <Metric label="total pago" value={formatCurrency(totalPaid)} />
                        <Metric label="ticket médio" value={formatCurrency(averageTicket)} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
                        <Card>
                            <CardContent>
                                <h2 className="mb-4 font-bold">produtos mais vendidos</h2>
                                <ReportTable rows={productRows} amountLabel="faturamento" showProfit />
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

type ReportTableRow = { name: string, quantity: number, amount: number, profit?: number | null }

function ReportTable({ rows, amountLabel, showProfit = false }: { rows: ReportTableRow[], amountLabel: string, showProfit?: boolean }) {
    if (rows.length === 0) return <p className="text-muted-foreground">sem dados para exibir</p>

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>nome</TableHead>
                    <TableHead className="text-right">qtd.</TableHead>
                    {showProfit && <TableHead className="text-right">lucro</TableHead>}
                    <TableHead className="text-right">{amountLabel}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.slice(0, 10).map((row) => (
                    <TableRow key={row.name}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        {showProfit && (
                            <TableCell className="text-right">
                                {row.profit == null ? "—" : formatCurrency(row.profit)}
                            </TableCell>
                        )}
                        <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

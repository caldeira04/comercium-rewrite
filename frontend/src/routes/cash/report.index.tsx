import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useCashList } from "@/hooks/use-cash"
import { periodOrCash, useReportFilters } from "@/hooks/use-report-filters"
import { useFormatDateTime, useTenantDates } from "@/hooks/use-tenant-timezone"
import { useTenantName } from "@/hooks/use-tenant-name"
import {
    CASH_PERIOD_HINT,
    CASH_STATUS_OPTIONS,
    CashFilterSelect,
    FilterSelect,
    ReportFilters,
    optionLabel,
    periodExportInfo,
    useSelectedCash,
} from "@/components/report-filters"
import { ExportMenu } from "@/components/export-menu"
import { buildCashReportExport, getPaymentRows, summarizeCashes } from "@/lib/reports/cash-report"
import type { ReportExport } from "@/lib/export/types"
import { formatCurrency, translatePaymentMethod } from "@/utils/finance"

export const Route = createFileRoute("/cash/report/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { monthStart, monthEnd } = useTenantDates()
    const { filters, invalidRange: invalidPeriod, setFilter, setFilters, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        status: "all",
        cashId: "all",
    })
    const hasCash = filters.cashId !== "all"
    const invalidRange = invalidPeriod && !hasCash
    const tenantName = useTenantName()
    const formatDateTime = useFormatDateTime()
    const selectedCash = useSelectedCash(filters.cashId)
    const cashesQuery = useCashList({ ...periodOrCash(filters), status: filters.status }, { enabled: !invalidRange })
    const cashes = invalidRange ? undefined : cashesQuery.data
    const { inflow: totalInflow, outflow: totalOutflow, difference: totalDifference, closed: closedCashes } = summarizeCashes(cashes ?? [])
    const paymentRows = getPaymentRows(cashes ?? [])

    function buildExport(): ReportExport | null {
        if (!cashes || cashes.length === 0) return null

        const period = periodExportInfo(filters, selectedCash)

        return buildCashReportExport(cashes, {
            tenantName,
            formatDateTime,
            fileSuffix: period.fileSuffix,
            filters: [period.filter, { label: "Situação", value: optionLabel(CASH_STATUS_OPTIONS, filters.status) }],
        })
    }

    return (
        <div className="flex w-full flex-col gap-4 self-start p-3 md:min-h-screen md:p-4">
            <div>
                <h1 className="text-xl font-bold uppercase md:text-2xl">relatório de caixas</h1>
                <p className="text-muted-foreground">entradas, saídas, pagamentos e diferenças dos caixas abertos no período</p>
            </div>
            <ReportFilters
                startDate={filters.startDate}
                endDate={filters.endDate}
                onPeriodChange={setFilters}
                invalidRange={invalidRange}
                periodDisabledHint={hasCash ? CASH_PERIOD_HINT : undefined}
                onReset={reset}
                actions={<ExportMenu build={buildExport} disabled={!cashes || cashes.length === 0} />}
            >
                <CashFilterSelect value={filters.cashId} onChange={(value) => setFilter("cashId", value)} />
                <FilterSelect
                    label="situação"
                    className="sm:w-36"
                    value={filters.status}
                    onChange={(value) => setFilter("status", value)}
                    options={CASH_STATUS_OPTIONS}
                />
            </ReportFilters>
            {!invalidRange && cashesQuery.isPending && <Spinner />}
            {!invalidRange && cashesQuery.isError && <span>ocorreu um erro ao buscar os caixas</span>}
            {cashes && (
                <>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
                        <Metric label="caixas" value={String(cashes.length)} />
                        <Metric label="fechados" value={String(closedCashes)} />
                        <Metric label="entradas" value={formatCurrency(totalInflow)} />
                        <Metric label="saídas" value={formatCurrency(totalOutflow)} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
                        <Metric label="saldo líquido" value={formatCurrency(totalInflow - totalOutflow)} />
                        <Metric label="diferença acumulada" value={formatCurrency(totalDifference)} />
                    </div>
                    <Card>
                        <CardContent>
                            <h2 className="mb-4 font-bold">entradas por forma de pagamento</h2>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>forma</TableHead>
                                        <TableHead className="text-right">pagamentos</TableHead>
                                        <TableHead className="text-right">total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentRows.map((row) => (
                                        <TableRow key={row.method}>
                                            <TableCell>{translatePaymentMethod(row.method)}</TableCell>
                                            <TableCell className="text-right">{row.salesCount}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

function Metric({ label, value }: { label: string, value: string }) {
    return <Card><CardContent><p className="text-sm uppercase text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>
}

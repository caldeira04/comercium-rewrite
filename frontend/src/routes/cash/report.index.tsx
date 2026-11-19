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
import { csvMoney } from "@/lib/export/csv"
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
    const totalInflow = cashes?.reduce((total, cash) => total + cash.amounts.inflow, 0) ?? 0
    const totalOutflow = cashes?.reduce((total, cash) => total + cash.amounts.outflow, 0) ?? 0
    const totalDifference = cashes?.reduce((total, cash) => total + (cash.amounts.difference ?? 0), 0) ?? 0
    const closedCashes = cashes?.filter((cash) => cash.status === "closed").length ?? 0
    const paymentRows = getPaymentRows(cashes ?? [])

    function buildExport(): ReportExport | null {
        if (!cashes || cashes.length === 0) return null

        const period = periodExportInfo(filters, selectedCash)
        const rows = cashes.map((cash) => ({
            cash,
            opened: formatDateTime(cash.openedAt),
            closed: cash.closedAt ? formatDateTime(cash.closedAt) : null,
        }))

        return {
            title: "Relatório de caixas",
            fileName: `relatorio-de-caixas_${period.fileSuffix}`,
            tenantName,
            filters: [period.filter, { label: "Situação", value: optionLabel(CASH_STATUS_OPTIONS, filters.status) }],
            metrics: [
                { label: "caixas", value: String(cashes.length) },
                { label: "fechados", value: String(closedCashes) },
                { label: "entradas", value: formatCurrency(totalInflow) },
                { label: "saídas", value: formatCurrency(totalOutflow) },
                { label: "saldo líquido", value: formatCurrency(totalInflow - totalOutflow) },
                { label: "diferença acumulada", value: formatCurrency(totalDifference) },
            ],
            tables: [
                {
                    title: "Entradas por forma de pagamento",
                    head: ["forma", "pagamentos", "total"],
                    rows: paymentRows.map((row) => [translatePaymentMethod(row.method) ?? row.method, String(row.salesCount), formatCurrency(row.amount)]),
                    align: { 1: "right", 2: "right" },
                },
                {
                    title: "Caixas",
                    head: ["nº", "abertura", "fechamento", "entradas", "saídas", "esperado", "contado", "diferença"],
                    rows: rows.map(({ cash, opened, closed }) => [
                        String(cash.number),
                        `${opened.date} ${opened.time}`,
                        closed ? `${closed.date} ${closed.time}` : "aberto",
                        formatCurrency(cash.amounts.inflow),
                        formatCurrency(cash.amounts.outflow),
                        formatCurrency(cash.amounts.expectedClosing),
                        cash.amounts.actualClosing === null ? "-" : formatCurrency(cash.amounts.actualClosing),
                        cash.amounts.difference === null ? "-" : formatCurrency(cash.amounts.difference),
                    ]),
                    align: { 0: "right", 3: "right", 4: "right", 5: "right", 6: "right", 7: "right" },
                },
            ],
            csv: {
                headers: ["nº", "situação", "data de abertura", "hora de abertura", "data de fechamento", "hora de fechamento", "operador", "entradas", "saídas", "esperado", "contado", "diferença", "dinheiro", "PIX", "débito", "crédito", "cheque"],
                rows: rows.map(({ cash, opened, closed }) => {
                    const byMethod = (method: string) => cash.paymentSummary.find((entry) => entry.method === method)?.amount ?? 0

                    return [
                        cash.number,
                        cash.status === "open" ? "aberto" : "fechado",
                        opened.date,
                        opened.time,
                        closed?.date ?? "",
                        closed?.time ?? "",
                        cash.users.createdBy?.login ?? "sistema",
                        csvMoney(cash.amounts.inflow),
                        csvMoney(cash.amounts.outflow),
                        csvMoney(cash.amounts.expectedClosing),
                        csvMoney(cash.amounts.actualClosing),
                        csvMoney(cash.amounts.difference),
                        csvMoney(byMethod("cash")),
                        csvMoney(byMethod("pix")),
                        csvMoney(byMethod("debit")),
                        csvMoney(byMethod("credit")),
                        csvMoney(byMethod("voucher")),
                    ]
                }),
            },
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col gap-4 self-start p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">relatório de caixas</h1>
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
                    className="w-36"
                    value={filters.status}
                    onChange={(value) => setFilter("status", value)}
                    options={CASH_STATUS_OPTIONS}
                />
            </ReportFilters>
            {!invalidRange && cashesQuery.isPending && <Spinner />}
            {!invalidRange && cashesQuery.isError && <span>ocorreu um erro ao buscar os caixas</span>}
            {cashes && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        <Metric label="caixas" value={String(cashes.length)} />
                        <Metric label="fechados" value={String(closedCashes)} />
                        <Metric label="entradas" value={formatCurrency(totalInflow)} />
                        <Metric label="saídas" value={formatCurrency(totalOutflow)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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

function getPaymentRows(cashes: NonNullable<ReturnType<typeof useCashList>["data"]>) {
    const rows = new Map<"cash" | "pix" | "debit" | "credit" | "voucher", { method: "cash" | "pix" | "debit" | "credit" | "voucher", amount: number, salesCount: number }>()

    cashes.forEach((cash) => {
        cash.paymentSummary.forEach((payment) => {
            const method = payment.method as "cash" | "pix" | "debit" | "credit" | "voucher"
            const current = rows.get(method) ?? { method, amount: 0, salesCount: 0 }
            rows.set(method, {
                method,
                amount: current.amount + payment.amount,
                salesCount: current.salesCount + payment.salesCount,
            })
        })
    })

    return [...rows.values()].sort((a, b) => b.amount - a.amount)
}

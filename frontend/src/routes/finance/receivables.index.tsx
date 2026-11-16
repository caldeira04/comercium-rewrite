import { createFileRoute } from "@tanstack/react-router"
import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Pagination } from "@/components/admin/pagination"
import { useClients } from "@/hooks/use-clients"
import {
    useExportReceivables,
    useReceivables,
    type ReceivableStatusFilter,
} from "@/hooks/use-receivables"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatCurrency } from "@/utils/finance"
import { formatPaymentMethod } from "@/utils/formatters"
import { formatDateTimeInZone } from "@/utils/time"
import { useReportFilters } from "@/hooks/use-report-filters"
import { useTenantDates } from "@/hooks/use-tenant-timezone"
import { FilterSelect, ReportFilters, clientOptions } from "@/components/report-filters"

export const Route = createFileRoute("/finance/receivables/")({
    component: RouteComponent,
})

const PAGE_SIZE = 20

const statusLabels: Record<string, string> = {
    paid: "recebido",
    refunded: "estornado",
    pending: "pendente",
    cancelled: "cancelado",
}

function RouteComponent() {
    const { monthStart, monthEnd } = useTenantDates()
    const { filters, page, invalidRange, setFilter, setFilters, setPage, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        clientId: "all",
        status: "paid",
    })
    const { startDate, endDate, clientId } = filters
    const status = filters.status as ReceivableStatusFilter

    const { clients } = useClients()
    const { mutateAsync: exportReceivables, isPending: exportIsPending } = useExportReceivables()

    const parsedClientId = clientId === "all"
        ? undefined
        : clientId === "none"
            ? "none" as const
            : Number(clientId)

    const receivablesQuery = useReceivables(
        {
            startDate,
            endDate,
            clientId: parsedClientId,
            status,
            page,
            pageSize: PAGE_SIZE,
        },
        { enabled: !invalidRange },
    )

    const data = invalidRange ? undefined : receivablesQuery.data
    const isPending = !invalidRange && receivablesQuery.isPending
    const isError = !invalidRange && receivablesQuery.isError

    const selectedClient = clients?.find((client) => String(client.id) === clientId)
    const clientLabel = clientId === "all"
        ? "todos"
        : clientId === "none"
            ? "não informado"
            : selectedClient?.name ?? "selecionado"
    const statusLabel = status === "paid"
        ? "recebidos"
        : status === "refunded"
            ? "estornados"
            : "todos"

    async function handleExport() {
        if (invalidRange) {
            toast.error("a data inicial deve ser anterior ou igual à data final")
            return
        }

        try {
            const result = await exportReceivables({
                startDate,
                endDate,
                clientId: parsedClientId,
                status,
            })

            if (!result || result.rows.length === 0) {
                toast.info("nenhum lançamento para exportar")
                return
            }

            const { generateReceivablesPdf } = await import("@/lib/receivables-pdf")

            generateReceivablesPdf({
                tenantName: result.tenantName,
                startDate,
                endDate,
                statusLabel,
                clientLabel,
                timeZone: result.timeZone,
                rows: result.rows,
                summary: result.summary,
            })

            if (result.truncated) {
                toast.warning("o PDF foi limitado a 5.000 lançamentos; reduza o período para exportar tudo")
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao exportar PDF"))
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col gap-4 self-start p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">contas a receber</h1>
                <p className="text-muted-foreground">recebimentos por data de pagamento</p>
            </div>

            <ReportFilters
                startDate={startDate}
                endDate={endDate}
                onPeriodChange={setFilters}
                invalidRange={invalidRange}
                onReset={reset}
                actions={
                    <Button
                        disabled={exportIsPending || invalidRange}
                        onClick={handleExport}
                    >
                        <DownloadIcon />
                        {exportIsPending ? "gerando..." : "exportar PDF"}
                    </Button>
                }
            >
                <FilterSelect
                    label="cliente"
                    className="w-56"
                    value={clientId}
                    onChange={(value) => setFilter("clientId", value)}
                    options={clientOptions(clients)}
                />
                <FilterSelect
                    label="situação"
                    className="w-40"
                    value={status}
                    onChange={(value) => setFilter("status", value)}
                    options={[
                        { value: "paid", label: "recebidos" },
                        { value: "refunded", label: "estornados" },
                        { value: "all", label: "todos" },
                    ]}
                />
            </ReportFilters>

            {isPending && <Spinner />}
            {isError && <p className="text-muted-foreground">ocorreu um erro ao buscar os lançamentos</p>}

            {data && (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard label="lançamentos" value={String(data.summary.count)} />
                        <SummaryCard label="recebido" value={formatCurrency(data.summary.received)} />
                        <SummaryCard label="estornado" value={formatCurrency(data.summary.refunded)} />
                        <SummaryCard label="líquido" value={formatCurrency(data.summary.net)} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="flex flex-col gap-4">
                            <Card>
                                <CardContent>
                                    {data.rows.length === 0 ? (
                                        <p className="py-8 text-center text-muted-foreground">
                                            nenhum lançamento encontrado para os filtros selecionados
                                        </p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>data do pagamento</TableHead>
                                                    <TableHead>cliente</TableHead>
                                                    <TableHead>venda</TableHead>
                                                    <TableHead>forma</TableHead>
                                                    <TableHead className="text-right">valor</TableHead>
                                                    <TableHead>situação</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.rows.map((row) => {
                                                    const paidAt = formatDateTimeInZone(row.paidAt, data.timeZone)

                                                    return (
                                                        <TableRow key={row.id}>
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span>{paidAt.date}</span>
                                                                    <span className="text-xs text-muted-foreground">{paidAt.time}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{row.client?.name ?? "não informado"}</TableCell>
                                                            <TableCell className="font-mono text-xs">
                                                                #{row.sale.id.split("-")[0]}
                                                            </TableCell>
                                                            <TableCell className="capitalize">
                                                                {formatPaymentMethod({ method: row.paymentMethod })}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {formatCurrency(row.amount)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={statusVariant(row.status)}>
                                                                    {statusLabels[row.status] ?? row.status}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            {data.rows.length > 0 && (
                                <Pagination
                                    page={data.pagination.page}
                                    totalPages={data.pagination.totalPages}
                                    total={data.pagination.total}
                                    pageSize={PAGE_SIZE}
                                    onPageChange={setPage}
                                />
                            )}
                        </div>

                        <Card className="self-start">
                            <CardContent>
                                <h2 className="mb-3 font-bold">totais por forma</h2>
                                {data.byPaymentMethod.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">nenhum valor no período</p>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {data.byPaymentMethod.map((entry) => (
                                            <div key={entry.method} className="flex flex-col gap-0.5 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="capitalize">
                                                        {formatPaymentMethod({ method: entry.method })}
                                                    </span>
                                                    <span className="tabular-nums">
                                                        {formatCurrency(entry.received)}
                                                    </span>
                                                </div>
                                                {entry.refunded > 0 && (
                                                    <div className="flex items-center justify-between text-xs text-destructive">
                                                        <span>estornado</span>
                                                        <span className="tabular-nums">
                                                            - {formatCurrency(entry.refunded)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardContent>
                <p className="text-sm uppercase text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </CardContent>
        </Card>
    )
}

function statusVariant(status: string): "secondary" | "destructive" | "outline" {
    if (status === "paid") return "secondary"
    if (status === "refunded") return "destructive"
    return "outline"
}

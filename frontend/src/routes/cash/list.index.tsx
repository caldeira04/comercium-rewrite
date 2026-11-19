import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowDownLeftIcon, ArrowUpRightIcon, LockIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useCashList, useCashMovements } from "@/hooks/use-cash"
import type { CashListItem } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"
import { formatRecordNumber } from "@/utils/formatters"
import { formatDateInput } from "@/utils/time"
import { useReportFilters } from "@/hooks/use-report-filters"
import { useFormatDateTime, useTenantDates } from "@/hooks/use-tenant-timezone"
import { useTenantName } from "@/hooks/use-tenant-name"
import { CASH_STATUS_OPTIONS, FilterSelect, ReportFilters, optionLabel } from "@/components/report-filters"
import { ExportMenu } from "@/components/export-menu"
import { buildCashListExport } from "@/lib/reports/cash-report"
import type { ReportExport } from "@/lib/export/types"
import { buildCashStatementExport, describeCashMovement, type CashStatementMovement } from "@/lib/reports/cash-statement"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/cash/list/")({
    component: RouteComponent,
})

function RouteComponent() {
    const formatDateTime = useFormatDateTime()
    const tenantName = useTenantName()
    const { monthStart, monthEnd } = useTenantDates()
    const { filters, invalidRange, setFilter, setFilters, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        status: "all",
    })
    const cashesQuery = useCashList(filters, { enabled: !invalidRange })
    const cashes = invalidRange ? undefined : cashesQuery.data
    const [selectedCashId, setSelectedCashId] = useState<string | null>(null)
    const selectedCash = cashes?.find((cash) => cash.id === selectedCashId) ?? null

    function buildExport(): ReportExport | null {
        if (!cashes || cashes.length === 0) return null

        return buildCashListExport(cashes, {
            tenantName,
            formatDateTime,
            fileSuffix: `${filters.startDate}_${filters.endDate}`,
            filters: [
                { label: "Período (abertura)", value: `${formatDateInput(filters.startDate)} a ${formatDateInput(filters.endDate)}` },
                { label: "Situação", value: optionLabel(CASH_STATUS_OPTIONS, filters.status) },
            ],
        })
    }

    return (
        <div className="flex h-screen w-full gap-4 self-start p-4">
            <div className="flex w-full min-w-0 flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold uppercase">histórico de caixas</h1>
                    <p className="text-muted-foreground">aberturas, fechamentos e diferenças por caixa</p>
                </div>
                <ReportFilters
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onPeriodChange={setFilters}
                    invalidRange={invalidRange}
                    onReset={reset}
                    actions={<ExportMenu build={buildExport} disabled={!cashes || cashes.length === 0} />}
                >
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
                {cashes && cashes.length === 0 && (
                    <Card><CardContent className="text-center text-muted-foreground">nenhum caixa encontrado para os filtros selecionados</CardContent></Card>
                )}
                {cashes && cashes.length > 0 && (
                    <div className="min-h-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[70px]">nº</TableHead>
                                    <TableHead>status</TableHead>
                                    <TableHead>abertura</TableHead>
                                    <TableHead>fechamento</TableHead>
                                    <TableHead>operador</TableHead>
                                    <TableHead className="text-right">esperado</TableHead>
                                    <TableHead className="text-right">contado</TableHead>
                                    <TableHead className="text-right">diferença</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cashes.map((cash) => (
                                    <TableRow
                                        key={cash.id}
                                        className={cn("cursor-pointer", cash.id === selectedCashId && "bg-muted")}
                                        onClick={() => setSelectedCashId(cash.id)}
                                    >
                                        <TableCell className="font-medium tabular-nums">{cash.number}</TableCell>
                                        <TableCell><Badge className={cash.status === "open" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"}>{cash.status === "open" ? "aberto" : "fechado"}</Badge></TableCell>
                                        <TableCell>{formatDateTime(cash.openedAt).date}</TableCell>
                                        <TableCell>{cash.closedAt ? formatDateTime(cash.closedAt).date : "-"}</TableCell>
                                        <TableCell>{cash.users.createdBy?.login ?? "sistema"}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(cash.amounts.expectedClosing)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(cash.amounts.actualClosing ?? 0)}</TableCell>
                                        <TableCell className={cash.amounts.difference && cash.amounts.difference < 0 ? "text-right text-[var(--danger)]" : "text-right text-[var(--success)]"}>{formatCurrency(cash.amounts.difference ?? 0)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
            <div className="flex w-[400px] shrink-0 flex-col">
                <CashDetails cash={selectedCash} />
            </div>
        </div>
    )
}

type MovementFilter = "all" | "in" | "out"

function CashDetails({ cash }: { cash: CashListItem | null }) {
    const formatDateTime = useFormatDateTime()
    const tenantName = useTenantName()
    const statementQuery = useCashMovements(cash?.id ?? null)
    const [movementFilter, setMovementFilter] = useState<MovementFilter>("all")

    if (!cash) {
        return <Card className="h-full"><CardContent className="flex h-full items-center justify-center text-center text-muted-foreground">selecione um caixa para ver detalhes</CardContent></Card>
    }

    const statement = statementQuery.data
    const movements = statement?.movements.filter((movement) => movementFilter === "all" || movement.nature === movementFilter) ?? []

    return (
        <Card className="h-full min-h-0">
            <CardContent className="flex h-full min-h-0 flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-bold">caixa {formatRecordNumber(cash.number)}</h2>
                        <p className="text-sm text-muted-foreground">
                            {cash.status === "open" ? "aberto" : "fechado"} · {formatDateTime(cash.openedAt).date} {formatDateTime(cash.openedAt).time}
                            {cash.users.createdBy && ` · ${cash.users.createdBy.login}`}
                        </p>
                    </div>
                    <ExportMenu
                        variant="outline"
                        size="sm"
                        disabled={!statement}
                        build={() => statement ? buildCashStatementExport(statement, { tenantName, formatDateTime }) : null}
                    />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <Metric label="abertura" value={formatCurrency(cash.amounts.opening)} />
                    <Metric label="entradas" value={formatCurrency(cash.amounts.inflow)} />
                    <Metric label="saídas" value={formatCurrency(cash.amounts.outflow)} />
                    <Metric label="esperado" value={formatCurrency(cash.amounts.expectedClosing)} />
                    <Metric label="contado" value={cash.amounts.actualClosing === null ? "-" : formatCurrency(cash.amounts.actualClosing)} />
                    <Metric
                        label="diferença"
                        value={cash.amounts.difference === null ? "-" : formatCurrency(cash.amounts.difference)}
                        className={cash.amounts.difference !== null && cash.amounts.difference < 0 ? "text-[var(--danger)]" : undefined}
                    />
                </div>
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold">movimentações</h3>
                    <Tabs value={movementFilter} onValueChange={(value) => setMovementFilter(value as MovementFilter)}>
                        <TabsList>
                            <TabsTrigger value="all">todas</TabsTrigger>
                            <TabsTrigger value="in">entradas</TabsTrigger>
                            <TabsTrigger value="out">saídas</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="-mx-1 min-h-0 flex-1 overflow-auto px-1">
                    {statementQuery.isPending && <Spinner />}
                    {statementQuery.isError && <p className="text-sm text-muted-foreground">ocorreu um erro ao buscar as movimentações</p>}
                    {statement && movements.length === 0 && (
                        <p className="text-sm text-muted-foreground">nenhuma movimentação</p>
                    )}
                    {statement && (
                        <ol className="flex flex-col">
                            {movements.map((movement) => (
                                <MovementRow key={movement.id} movement={movement} />
                            ))}
                            {movementFilter === "all" && statement.cash.closedAt && (
                                <li className="flex gap-3 border-t py-3 text-sm">
                                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <LockIcon className="size-3.5" />
                                    </span>
                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <div className="flex justify-between gap-2">
                                            <span className="font-medium">fechamento do caixa</span>
                                            <span className="text-xs text-muted-foreground">{formatDateTime(statement.cash.closedAt).time}</span>
                                        </div>
                                        <span className="text-muted-foreground">
                                            contado {statement.totals.actualClosing === null ? "-" : formatCurrency(statement.totals.actualClosing)}
                                            {" · "}esperado {formatCurrency(statement.totals.expectedClosing)}
                                            {statement.cash.closedBy && ` · ${statement.cash.closedBy}`}
                                        </span>
                                    </div>
                                </li>
                            )}
                        </ol>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function MovementRow({ movement }: { movement: CashStatementMovement }) {
    const formatDateTime = useFormatDateTime()
    const { title, details } = describeCashMovement(movement)
    const isIn = movement.nature === "in"
    const at = formatDateTime(movement.createdAt)

    return (
        <li className="flex gap-3 border-t py-3 text-sm first:border-t-0">
            <span className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                isIn ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--danger-soft)] text-[var(--danger)]",
            )}>
                {isIn ? <ArrowDownLeftIcon className="size-3.5" /> : <ArrowUpRightIcon className="size-3.5" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex justify-between gap-2">
                    <span className="font-medium">{title}</span>
                    <span className={cn("shrink-0 font-medium tabular-nums", isIn ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                        {isIn ? "+" : "−"} {formatCurrency(movement.amount)}
                    </span>
                </div>
                {details.map((detail) => (
                    <span key={detail} className="break-words text-muted-foreground">{detail}</span>
                ))}
                <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span>{at.time}{movement.user && ` · ${movement.user}`}</span>
                    <span className="tabular-nums">saldo {formatCurrency(movement.balance)}</span>
                </div>
            </div>
        </li>
    )
}

function Metric({ label, value, className }: { label: string, value: string, className?: string }) {
    return <div className="rounded-lg border p-2"><p className="text-[0.65rem] uppercase text-muted-foreground">{label}</p><p className={cn("text-sm font-bold", className)}>{value}</p></div>
}

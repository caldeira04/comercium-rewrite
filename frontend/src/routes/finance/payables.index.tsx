import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { DownloadIcon, MoreHorizontalIcon, PlusIcon, Settings2Icon } from "lucide-react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/admin/pagination"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { usePayees } from "@/hooks/use-payees"
import { useBankAccounts } from "@/hooks/use-bank-accounts"
import { useExpenseCategories } from "@/hooks/use-expense-categories"
import {
    useDeletePayable,
    useExportPayables,
    usePayables,
    useReversePayable,
    type PayableStatusFilter,
} from "@/hooks/use-payables"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatCurrency } from "@/utils/finance"
import { formatPaymentMethod } from "@/utils/formatters"
import { formatDateInput } from "@/utils/time"
import { parseReferenceFilter, useReportFilters } from "@/hooks/use-report-filters"
import { useTenantDates } from "@/hooks/use-tenant-timezone"
import { FilterSelect, ReportFilters } from "@/components/report-filters"
import type { Payable } from "@/lib/api-types"
import { PayableFormDialog } from "@/components/payables/payable-form-dialog"
import { PayablePaymentDialog } from "@/components/payables/payable-payment-dialog"
import { PayablesRegistryDialog } from "@/components/payables/payables-registry-dialog"
import { payableStatusLabels } from "@/components/payables/constants"

export const Route = createFileRoute("/finance/payables/")({
    component: RouteComponent,
})

const PAGE_SIZE = 20

const statusFilterLabels: Record<PayableStatusFilter, string> = {
    pending: "pendentes",
    paid: "pagos",
    overdue: "vencidos",
    all: "todos",
}

function RouteComponent() {
    const { monthStart, monthEnd } = useTenantDates()
    const { filters, page, invalidRange, setFilter, setFilters, setPage, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        payeeId: "all",
        bankAccountId: "all",
        categoryId: "all",
        status: "all",
    })
    const { startDate, endDate, payeeId, bankAccountId, categoryId } = filters
    const status = filters.status as PayableStatusFilter

    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Payable | null>(null)
    const [paymentOpen, setPaymentOpen] = useState(false)
    const [paying, setPaying] = useState<Payable | null>(null)
    const [registryOpen, setRegistryOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Payable | null>(null)
    const [deleteScope, setDeleteScope] = useState<"single" | "group">("single")
    const [reverseTarget, setReverseTarget] = useState<Payable | null>(null)

    const { payees } = usePayees()
    const { bankAccounts } = useBankAccounts()
    const { expenseCategories } = useExpenseCategories()
    const exportMutation = useExportPayables()
    const deleteMutation = useDeletePayable()
    const reverseMutation = useReversePayable()

    const parsedPayeeId = parseReferenceFilter(payeeId)
    const parsedBankAccountId = parseReferenceFilter(bankAccountId)
    const parsedCategoryId = parseReferenceFilter(categoryId)

    const payablesQuery = usePayables(
        {
            startDate,
            endDate,
            payeeId: parsedPayeeId,
            bankAccountId: parsedBankAccountId,
            categoryId: parsedCategoryId,
            status,
            page,
            pageSize: PAGE_SIZE,
        },
        { enabled: !invalidRange },
    )

    const data = invalidRange ? undefined : payablesQuery.data
    const isPending = !invalidRange && payablesQuery.isPending
    const isError = !invalidRange && payablesQuery.isError

    const payeeLabel = payeeId === "all"
        ? "todos"
        : payeeId === "none"
            ? "não informado"
            : payees?.find((payee) => payee.id === payeeId)?.name ?? "selecionado"
    const bankAccountLabel = bankAccountId === "all"
        ? "todas"
        : bankAccountId === "none"
            ? "não informada"
            : bankAccounts?.find((account) => account.id === bankAccountId)?.name ?? "selecionada"

    function openCreate() {
        setEditing(null)
        setFormOpen(true)
    }

    function openEdit(payable: Payable) {
        setEditing(payable)
        setFormOpen(true)
    }

    function openPayment(payable: Payable) {
        setPaying(payable)
        setPaymentOpen(true)
    }

    function openDelete(payable: Payable, scope: "single" | "group") {
        setDeleteTarget(payable)
        setDeleteScope(scope)
    }

    async function handleExport() {
        if (invalidRange) {
            toast.error("a data inicial deve ser anterior ou igual à data final")
            return
        }

        try {
            const result = await exportMutation.mutateAsync({
                startDate,
                endDate,
                payeeId: parsedPayeeId,
                bankAccountId: parsedBankAccountId,
                categoryId: parsedCategoryId,
                status,
            })

            if (!result || result.rows.length === 0) {
                toast.info("nenhum lançamento para exportar")
                return
            }

            const { generatePayablesPdf } = await import("@/lib/payables-pdf")

            generatePayablesPdf({
                tenantName: result.tenantName,
                startDate,
                endDate,
                statusLabel: statusFilterLabels[status],
                payeeLabel,
                bankAccountLabel,
                rows: result.rows,
                summary: result.summary,
                truncated: result.truncated,
            })

            if (result.truncated) {
                toast.warning("o PDF foi limitado a 5.000 lançamentos; reduza o período para exportar tudo")
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao exportar PDF"))
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return

        try {
            const result = await deleteMutation.mutateAsync({
                payableId: deleteTarget.id,
                scope: deleteScope,
            })

            if (result && "skippedPaid" in result && result.skippedPaid > 0) {
                toast.warning(`${result.deleted} lançamento(s) excluído(s); ${result.skippedPaid} pago(s) mantido(s)`)
            } else {
                toast.success("lançamento excluído")
            }

            setDeleteTarget(null)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao excluir lançamento"))
        }
    }

    async function handleReverse() {
        if (!reverseTarget) return

        try {
            await reverseMutation.mutateAsync(reverseTarget.id)
            toast.success("baixa estornada")
            setReverseTarget(null)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao estornar baixa"))
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col gap-4 self-start p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold uppercase">contas a pagar</h1>
                    <p className="text-muted-foreground">despesas por data de vencimento</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setRegistryOpen(true)}>
                        <Settings2Icon />
                        cadastros
                    </Button>
                    <Button onClick={openCreate}>
                        <PlusIcon />
                        novo lançamento
                    </Button>
                </div>
            </div>

            <ReportFilters
                startDate={startDate}
                endDate={endDate}
                onPeriodChange={setFilters}
                invalidRange={invalidRange}
                onReset={reset}
                actions={
                    <Button disabled={exportMutation.isPending || invalidRange} onClick={handleExport}>
                        <DownloadIcon />
                        {exportMutation.isPending ? "gerando..." : "exportar PDF"}
                    </Button>
                }
            >
                <FilterSelect
                    label="favorecido"
                    className="w-48"
                    value={payeeId}
                    onChange={(value) => setFilter("payeeId", value)}
                    options={[
                        { value: "all", label: "todos os favorecidos" },
                        { value: "none", label: "não informado" },
                        ...(payees ?? []).map((item) => ({ value: item.id, label: item.name })),
                    ]}
                />
                <FilterSelect
                    label="conta bancária"
                    value={bankAccountId}
                    onChange={(value) => setFilter("bankAccountId", value)}
                    options={[
                        { value: "all", label: "todas as contas" },
                        { value: "none", label: "não informada" },
                        ...(bankAccounts ?? []).map((item) => ({ value: item.id, label: item.name })),
                    ]}
                />
                <FilterSelect
                    label="categoria"
                    value={categoryId}
                    onChange={(value) => setFilter("categoryId", value)}
                    options={[
                        { value: "all", label: "todas as categorias" },
                        { value: "none", label: "sem categoria" },
                        ...(expenseCategories ?? []).map((item) => ({ value: item.id, label: item.name })),
                    ]}
                />
                <FilterSelect
                    label="situação"
                    className="w-36"
                    value={status}
                    onChange={(value) => setFilter("status", value)}
                    options={[
                        { value: "all", label: "todos" },
                        { value: "pending", label: "pendentes" },
                        { value: "overdue", label: "vencidos" },
                        { value: "paid", label: "pagos" },
                    ]}
                />
            </ReportFilters>

            {isPending && <Spinner />}
            {isError && <p className="text-muted-foreground">ocorreu um erro ao buscar os lançamentos</p>}

            {data && (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <SummaryCard label="lançamentos" value={String(data.summary.count)} />
                        <SummaryCard label="total filtrado" value={formatCurrency(data.summary.total)} />
                        <SummaryCard label="pendente" value={formatCurrency(data.summary.pending.amount)} />
                        <SummaryCard label="vencido" value={formatCurrency(data.summary.overdue.amount)} />
                        <SummaryCard label="pago" value={formatCurrency(data.summary.paid.amount)} />
                    </div>

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
                                            <TableHead>vencimento</TableHead>
                                            <TableHead>pagamento</TableHead>
                                            <TableHead>favorecido</TableHead>
                                            <TableHead>descrição</TableHead>
                                            <TableHead>origem</TableHead>
                                            <TableHead>forma</TableHead>
                                            <TableHead>conta</TableHead>
                                            <TableHead className="text-right">valor</TableHead>
                                            <TableHead>situação</TableHead>
                                            <TableHead className="w-10" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.rows.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {formatDateInput(row.dueDate)}
                                                    {row.installmentCount > 1 && (
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            {row.installmentNumber}/{row.installmentCount}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {row.paidDate ? formatDateInput(row.paidDate) : "-"}
                                                </TableCell>
                                                <TableCell>{row.payee?.name ?? "não informado"}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{row.description}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {row.category?.name ?? "sem categoria"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {row.origin === "stock_purchase" ? (
                                                        <Badge variant="outline" className="whitespace-nowrap">
                                                            estoque
                                                            {row.stockMovementId && (
                                                                <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                                                    #{row.stockMovementId.slice(0, 6)}
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">manual</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="capitalize">
                                                    {row.paymentMethod ? formatPaymentMethod({ method: row.paymentMethod }) : "-"}
                                                </TableCell>
                                                <TableCell>{row.bankAccount?.name ?? "-"}</TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {formatCurrency(row.amount)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusVariant(row.status)}>
                                                        {payableStatusLabels[row.status] ?? row.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon-sm" aria-label="ações">
                                                                <MoreHorizontalIcon />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => openEdit(row)}>
                                                                editar
                                                            </DropdownMenuItem>
                                                            {row.paidDate ? (
                                                                <DropdownMenuItem onSelect={() => setReverseTarget(row)}>
                                                                    estornar baixa
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem onSelect={() => openPayment(row)}>
                                                                    dar baixa
                                                                </DropdownMenuItem>
                                                            )}
                                                            {!row.paidDate && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        variant="destructive"
                                                                        onSelect={() => openDelete(row, "single")}
                                                                    >
                                                                        excluir
                                                                    </DropdownMenuItem>
                                                                    {row.groupId && (
                                                                        <DropdownMenuItem
                                                                            variant="destructive"
                                                                            onSelect={() => openDelete(row, "group")}
                                                                        >
                                                                            excluir todas as não pagas
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
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
                </>
            )}

            <PayableFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                payable={editing}
            />

            <PayablePaymentDialog
                open={paymentOpen}
                onOpenChange={setPaymentOpen}
                payable={paying}
            />

            <PayablesRegistryDialog
                open={registryOpen}
                onOpenChange={setRegistryOpen}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(next) => {
                    if (!next) setDeleteTarget(null)
                }}
                title={deleteScope === "group" ? "excluir lançamentos do grupo" : "excluir lançamento"}
                description={deleteScope === "group"
                    ? "serão excluídos todos os lançamentos não pagos deste grupo. lançamentos pagos exigem estorno."
                    : "deseja excluir este lançamento? esta ação não pode ser desfeita."
                }
                confirmLabel="excluir"
                isPending={deleteMutation.isPending}
                onConfirm={handleDelete}
            />

            <ConfirmDialog
                open={reverseTarget !== null}
                onOpenChange={(next) => {
                    if (!next) setReverseTarget(null)
                }}
                title="estornar baixa"
                description="o lançamento voltará para a situação pendente/vencida e a data de pagamento será removida."
                confirmLabel="estornar"
                isPending={reverseMutation.isPending}
                onConfirm={handleReverse}
            />
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
    if (status === "overdue") return "destructive"
    return "outline"
}

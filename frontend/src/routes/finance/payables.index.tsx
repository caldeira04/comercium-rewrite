import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { DownloadIcon, MoreHorizontalIcon, PlusIcon, RotateCcwIcon, Settings2Icon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { formatDateInput, monthEndInputValue, monthStartInputValue } from "@/utils/time"
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
    const [startDate, setStartDate] = useState(monthStartInputValue())
    const [endDate, setEndDate] = useState(monthEndInputValue())
    const [payeeId, setPayeeId] = useState("all")
    const [bankAccountId, setBankAccountId] = useState("all")
    const [categoryId, setCategoryId] = useState("all")
    const [status, setStatus] = useState<PayableStatusFilter>("all")
    const [page, setPage] = useState(1)

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

    const invalidRange = startDate > endDate
    const parsedPayeeId = payeeId === "all" ? undefined : payeeId === "none" ? "none" as const : payeeId
    const parsedBankAccountId = bankAccountId === "all"
        ? undefined
        : bankAccountId === "none" ? "none" as const : bankAccountId
    const parsedCategoryId = categoryId === "all"
        ? undefined
        : categoryId === "none" ? "none" as const : categoryId

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

    function handleFilter(apply: () => void) {
        apply()
        setPage(1)
    }

    function handleReset() {
        setStartDate(monthStartInputValue())
        setEndDate(monthEndInputValue())
        setPayeeId("all")
        setBankAccountId("all")
        setCategoryId("all")
        setStatus("all")
        setPage(1)
    }

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

            <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                    <Label htmlFor="startDate">data inicial</Label>
                    <Input
                        id="startDate"
                        className="w-40"
                        type="date"
                        value={startDate}
                        max={endDate}
                        onChange={(event) => handleFilter(() => setStartDate(event.target.value))}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Label htmlFor="endDate">data final</Label>
                    <Input
                        id="endDate"
                        className="w-40"
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(event) => handleFilter(() => setEndDate(event.target.value))}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Label>favorecido</Label>
                    <Select value={payeeId} onValueChange={(value) => handleFilter(() => setPayeeId(value))}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="todos os favorecidos" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">todos os favorecidos</SelectItem>
                            <SelectItem value="none">não informado</SelectItem>
                            {payees?.map((payee) => (
                                <SelectItem key={payee.id} value={payee.id}>
                                    {payee.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1">
                    <Label>conta bancária</Label>
                    <Select value={bankAccountId} onValueChange={(value) => handleFilter(() => setBankAccountId(value))}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="todas as contas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">todas as contas</SelectItem>
                            <SelectItem value="none">não informada</SelectItem>
                            {bankAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1">
                    <Label>categoria</Label>
                    <Select value={categoryId} onValueChange={(value) => handleFilter(() => setCategoryId(value))}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="todas as categorias" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">todas as categorias</SelectItem>
                            <SelectItem value="none">sem categoria</SelectItem>
                            {expenseCategories?.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-1">
                    <Label>situação</Label>
                    <Select value={status} onValueChange={(value) => handleFilter(() => setStatus(value as PayableStatusFilter))}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="situação" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">todos</SelectItem>
                            <SelectItem value="pending">pendentes</SelectItem>
                            <SelectItem value="overdue">vencidos</SelectItem>
                            <SelectItem value="paid">pagos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" onClick={handleReset}>
                    <RotateCcwIcon />
                    limpar
                </Button>
                <Button disabled={exportMutation.isPending || invalidRange} onClick={handleExport}>
                    <DownloadIcon />
                    {exportMutation.isPending ? "gerando..." : "exportar PDF"}
                </Button>
            </div>

            {invalidRange && (
                <p className="text-sm text-destructive">
                    a data inicial deve ser anterior ou igual à data final
                </p>
            )}

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

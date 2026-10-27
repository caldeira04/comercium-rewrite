import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { usePayees } from "@/hooks/use-payees"
import { useBankAccounts } from "@/hooks/use-bank-accounts"
import { useExpenseCategories } from "@/hooks/use-expense-categories"
import {
    useCreatePayable,
    useUpdatePayable,
    type InstallmentMode,
    type PayablePaymentMethod,
} from "@/hooks/use-payables"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatCurrency, maskCurrency } from "@/utils/finance"
import { todayInputValue } from "@/utils/time"
import type { Payable } from "@/lib/api-types"
import {
    PayablesRegistryDialog,
    type RegistryTab,
} from "@/components/payables/payables-registry-dialog"
import { paymentMethodOptions } from "@/components/payables/constants"

type PayableFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    payable?: Payable | null
    defaultDueDate?: string
}

export function PayableFormDialog({
    open,
    onOpenChange,
    payable = null,
    defaultDueDate,
}: PayableFormDialogProps) {
    const isEditing = payable !== null
    const isPaid = Boolean(payable?.paidDate)

    const { payees } = usePayees()
    const { bankAccounts } = useBankAccounts()
    const { expenseCategories } = useExpenseCategories()
    const createPayableMutation = useCreatePayable()
    const updatePayableMutation = useUpdatePayable()

    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState(maskCurrency("0"))
    const [dueDate, setDueDate] = useState(todayInputValue())
    const [payeeId, setPayeeId] = useState("none")
    const [categoryId, setCategoryId] = useState("none")
    const [bankAccountId, setBankAccountId] = useState("none")
    const [paymentMethod, setPaymentMethod] = useState("none")
    const [notes, setNotes] = useState("")
    const [repeat, setRepeat] = useState(false)
    const [repeatCount, setRepeatCount] = useState("2")
    const [repeatMode, setRepeatMode] = useState<InstallmentMode>("recurring")
    const [registryOpen, setRegistryOpen] = useState(false)
    const [registryTab, setRegistryTab] = useState<RegistryTab>("payees")

    useEffect(() => {
        if (!open) return

        setDescription(payable?.description ?? "")
        setAmount(maskCurrency(String(payable?.amount ?? 0)))
        setDueDate(payable?.dueDate ?? defaultDueDate ?? todayInputValue())
        setPayeeId(payable?.payee?.id ?? "none")
        setCategoryId(payable?.category?.id ?? "none")
        setBankAccountId(payable?.bankAccount?.id ?? "none")
        setPaymentMethod(payable?.paymentMethod ?? "none")
        setNotes(payable?.notes ?? "")
        setRepeat(false)
        setRepeatCount("2")
        setRepeatMode("recurring")
    }, [open, payable, defaultDueDate])

    const amountInCents = Number(amount.replace(/\D/g, ""))
    const installmentCount = Math.max(1, Math.min(60, Number(repeatCount) || 1))

    function openRegistry(tab: RegistryTab) {
        setRegistryTab(tab)
        setRegistryOpen(true)
    }

    async function handleSubmit() {
        if (!description.trim()) {
            toast.error("informe a descrição do lançamento")
            return
        }

        if (!isEditing && amountInCents <= 0) {
            toast.error("informe um valor maior que zero")
            return
        }

        if (!dueDate) {
            toast.error("informe a data de vencimento")
            return
        }

        const basePayload = {
            description: description.trim(),
            amount: amountInCents,
            dueDate,
            paymentMethod: paymentMethod === "none" ? null : paymentMethod as PayablePaymentMethod,
            payeeId: payeeId === "none" ? null : payeeId,
            categoryId: categoryId === "none" ? null : categoryId,
            bankAccountId: bankAccountId === "none" ? null : bankAccountId,
            notes: notes.trim() ? notes.trim() : null,
        }

        try {
            if (isEditing) {
                await updatePayableMutation.mutateAsync({
                    payableId: payable.id,
                    payload: isPaid
                        ? {
                            description: basePayload.description,
                            notes: basePayload.notes,
                            payeeId: basePayload.payeeId,
                            categoryId: basePayload.categoryId,
                        }
                        : basePayload,
                })
                toast.success("lançamento atualizado")
            } else {
                await createPayableMutation.mutateAsync({
                    ...basePayload,
                    installments: repeat
                        ? { count: installmentCount, mode: repeatMode }
                        : undefined,
                })
                toast.success(repeat ? "lançamentos criados" : "lançamento criado")
            }

            onOpenChange(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao salvar lançamento"))
        }
    }

    const isPending = createPayableMutation.isPending || updatePayableMutation.isPending

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "editar lançamento" : "novo lançamento"}</DialogTitle>
                        <DialogDescription>
                            {isPaid
                                ? "lançamento pago: apenas descrição, observações, favorecido e categoria podem ser alterados"
                                : "despesa a pagar com vencimento, favorecido e conta bancária"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="payable-description">descrição</Label>
                            <Input
                                id="payable-description"
                                value={description}
                                placeholder="ex.: conta de luz"
                                onChange={(event) => setDescription(event.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="payable-amount">valor</Label>
                                <Input
                                    id="payable-amount"
                                    inputMode="numeric"
                                    value={amount}
                                    disabled={isPaid}
                                    onChange={(event) => setAmount(maskCurrency(event.target.value))}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="payable-due-date">vencimento</Label>
                                <Input
                                    id="payable-due-date"
                                    type="date"
                                    value={dueDate}
                                    disabled={isPaid}
                                    onChange={(event) => setDueDate(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <Label>favorecido</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="cadastrar favorecido"
                                        onClick={() => openRegistry("payees")}
                                    >
                                        <PlusIcon />
                                    </Button>
                                </div>
                                <Select value={payeeId} onValueChange={setPayeeId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                <div className="flex items-center justify-between">
                                    <Label>categoria</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="cadastrar categoria"
                                        onClick={() => openRegistry("categories")}
                                    >
                                        <PlusIcon />
                                    </Button>
                                </div>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">sem categoria</SelectItem>
                                        {expenseCategories?.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <Label>forma de pagamento</Label>
                                </div>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="w-full" disabled={isPaid}>
                                        <SelectValue placeholder="selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">não informada</SelectItem>
                                        {paymentMethodOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <Label>conta bancária</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label="cadastrar conta bancária"
                                        onClick={() => openRegistry("bankAccounts")}
                                    >
                                        <PlusIcon />
                                    </Button>
                                </div>
                                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                                    <SelectTrigger className="w-full" disabled={isPaid}>
                                        <SelectValue placeholder="definir na baixa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">definir na baixa</SelectItem>
                                        {bankAccounts?.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <Label htmlFor="payable-notes">observações</Label>
                            <Textarea
                                id="payable-notes"
                                value={notes}
                                placeholder="opcional"
                                onChange={(event) => setNotes(event.target.value)}
                            />
                        </div>

                        {!isEditing && (
                            <div className="flex flex-col gap-2 rounded-lg border p-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        id="payable-repeat"
                                        type="checkbox"
                                        className="size-4"
                                        checked={repeat}
                                        onChange={(event) => setRepeat(event.target.checked)}
                                    />
                                    <Label htmlFor="payable-repeat">repetir mensalmente</Label>
                                </div>

                                {repeat && (
                                    <>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="flex flex-col gap-1">
                                                <Label htmlFor="payable-repeat-count">quantidade</Label>
                                                <Input
                                                    id="payable-repeat-count"
                                                    type="number"
                                                    min={2}
                                                    max={60}
                                                    value={repeatCount}
                                                    onChange={(event) => setRepeatCount(event.target.value)}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Label>modo</Label>
                                                <Select
                                                    value={repeatMode}
                                                    onValueChange={(value) => setRepeatMode(value as InstallmentMode)}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="recurring">repetir o valor</SelectItem>
                                                        <SelectItem value="installment">dividir o valor total</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {repeatMode === "recurring"
                                                ? `${installmentCount} lançamentos mensais de ${formatCurrency(amountInCents)} cada`
                                                : `o valor total será dividido em ${installmentCount} parcelas mensais`}
                                            {" "}a partir do vencimento informado.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            cancelar
                        </Button>
                        <Button disabled={isPending} onClick={handleSubmit}>
                            {isPending ? "salvando..." : isEditing ? "salvar" : "criar lançamento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <PayablesRegistryDialog
                open={registryOpen}
                onOpenChange={setRegistryOpen}
                defaultTab={registryTab}
            />
        </>
    )
}

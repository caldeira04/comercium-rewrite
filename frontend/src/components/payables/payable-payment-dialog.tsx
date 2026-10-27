import { useEffect, useState } from "react"
import { toast } from "sonner"
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
import { useBankAccounts } from "@/hooks/use-bank-accounts"
import { usePayPayable, type PayablePaymentMethod } from "@/hooks/use-payables"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatCurrency } from "@/utils/finance"
import { formatDateInput, todayInputValue } from "@/utils/time"
import type { Payable } from "@/lib/api-types"
import { paymentMethodOptions } from "@/components/payables/constants"

type PayablePaymentDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    payable: Payable | null
}

export function PayablePaymentDialog({
    open,
    onOpenChange,
    payable,
}: PayablePaymentDialogProps) {
    const { bankAccounts } = useBankAccounts()
    const payPayableMutation = usePayPayable()

    const [paidDate, setPaidDate] = useState(todayInputValue())
    const [bankAccountId, setBankAccountId] = useState("none")
    const [paymentMethod, setPaymentMethod] = useState("none")

    useEffect(() => {
        if (!open) return

        setPaidDate(todayInputValue())
        setBankAccountId(payable?.bankAccount?.id ?? "none")
        setPaymentMethod(payable?.paymentMethod ?? "none")
    }, [open, payable])

    async function handleSubmit() {
        if (!payable) return

        if (!paidDate) {
            toast.error("informe a data do pagamento")
            return
        }

        try {
            await payPayableMutation.mutateAsync({
                payableId: payable.id,
                payload: {
                    paidDate,
                    bankAccountId: bankAccountId === "none" ? null : bankAccountId,
                    paymentMethod: paymentMethod === "none"
                        ? null
                        : paymentMethod as PayablePaymentMethod,
                },
            })
            toast.success("baixa registrada")
            onOpenChange(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao registrar baixa"))
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>dar baixa no lançamento</DialogTitle>
                    <DialogDescription>
                        registre a data, a conta e a forma de pagamento utilizadas
                    </DialogDescription>
                </DialogHeader>

                {payable && (
                    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
                        <span className="font-medium">{payable.description}</span>
                        <span className="text-muted-foreground">
                            vencimento {formatDateInput(payable.dueDate)} · {formatCurrency(payable.amount)}
                            {payable.installmentCount > 1
                                ? ` · parcela ${payable.installmentNumber}/${payable.installmentCount}`
                                : ""}
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <Label htmlFor="payable-paid-date">data do pagamento</Label>
                        <Input
                            id="payable-paid-date"
                            type="date"
                            value={paidDate}
                            max={todayInputValue()}
                            onChange={(event) => setPaidDate(event.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label>conta bancária</Label>
                        <Select value={bankAccountId} onValueChange={setBankAccountId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="selecione" />
                            </SelectTrigger>
                            <SelectContent>
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
                        <Label>forma de pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="w-full">
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
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        cancelar
                    </Button>
                    <Button disabled={payPayableMutation.isPending} onClick={handleSubmit}>
                        {payPayableMutation.isPending ? "registrando..." : "confirmar baixa"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

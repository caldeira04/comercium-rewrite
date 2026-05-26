import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { BanknoteArrowUpIcon } from "lucide-react"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { maskCurrency } from "@/utils/finance"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { usePayments } from "@/hooks/use-payments"
import { toast } from "sonner"

const paymentMethods = [
    {
        value: "cash",
        label: "dinheiro"
    },
    {
        value: "debit",
        label: "débito"
    },
    {
        value: "credit",
        label: "crédito"
    },
    {
        value: "pix",
        label: "PIX"
    },
    {
        value: "voucher",
        label: "cheque"
    },
] as const

type PaymentMethod = typeof paymentMethods[number]
type PaymentMethodValue = PaymentMethod["value"]

const defaultPaymentMethod = paymentMethods[0]

function findPaymentMethod(value: string): PaymentMethod {
    return paymentMethods.find((method) => method.value === value) ?? defaultPaymentMethod
}

export default function NewPaymentDialog({
    totalAmount, saleId, open: controlledOpen, onOpenChange

}: {
    totalAmount: number,
    saleId: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen ?? internalOpen
    const setOpen = onOpenChange ?? setInternalOpen
    const [amount, setAmount] = useState<string>(maskCurrency(String(totalAmount)))
    const { createPayments, createPaymentsIsPending } = usePayments()
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod)

    useEffect(() => {
        if (!open) setAmount(maskCurrency(String(totalAmount)))
    }, [open, totalAmount])

    const handleOpenCash = useCallback(async () => {
        const clearAmount = amount.replace(/\D/g, '')

        if (!saleId) {
            toast.error("é necessário iniciar uma venda para adicionar pagamentos")
            return
        }

        await createPayments({
            paidAmount: Number(clearAmount),
            paymentMethod: paymentMethod.value,
            saleId,
            totalAmount
        })
        toast.success("pagamento lançado com sucesso")
        setOpen(false)
    }, [amount, createPayments, paymentMethod.value, saleId, setOpen, totalAmount])

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (!open || createPaymentsIsPending || event.key !== "Enter") return

            const target = event.target
            if (
                target instanceof HTMLElement &&
                target.closest("[data-slot='select-content']")
            ) {
                return
            }

            event.preventDefault()
            handleOpenCash()
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [createPaymentsIsPending, handleOpenCash, open])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="p-4 w-full"
                ><BanknoteArrowUpIcon />adicionar pagamento</Button>
            </DialogTrigger>
            <DialogContent className="min-w-1/4">
                <DialogHeader>
                    <DialogTitle>adicionar pagamento</DialogTitle>
                    <DialogDescription>
                        insira o valor e selecione a forma de pagamento
                    </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 items-center">
                    <div className="flex flex-col gap-1">
                        <Label htmlFor="amount">valor</Label>
                        <Input
                            id="amount"
                            value={amount}
                            onChange={(e) => {
                                setAmount(maskCurrency(e.target.value))
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Label htmlFor="paymentMethod">forma de pagamento</Label>
                        <Select
                            value={paymentMethod.value}
                            onValueChange={(value: PaymentMethodValue) => {
                                setPaymentMethod(findPaymentMethod(value))
                            }}
                        >
                            <SelectTrigger className="w-full max-w-48">
                                <SelectValue placeholder="forma de pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map((p) => (
                                    <SelectItem
                                        className="p-2"
                                        key={p.value}
                                        value={p.value}
                                    >{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        disabled={createPaymentsIsPending}
                        onClick={() => handleOpenCash()}
                    >adicionar pagamento</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )

}

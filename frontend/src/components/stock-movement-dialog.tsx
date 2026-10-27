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
    DialogTrigger,
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
import { useStock } from "@/hooks/use-stock"
import { useProducts } from "@/hooks/use-products"
import { usePayees } from "@/hooks/use-payees"
import { useBankAccounts } from "@/hooks/use-bank-accounts"
import { useExpenseCategories } from "@/hooks/use-expense-categories"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatCurrency, maskCurrency } from "@/utils/finance"
import { todayInputValue } from "@/utils/time"
import { paymentMethodOptions } from "@/components/payables/constants"

type MovementType = "in" | "out" | "adjustment" | "transfer"
type InstallmentMode = "recurring" | "installment"

export default function StockMovementDialog({ productId }: { productId: number }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<"movement" | "payable">("movement")
    const [type, setType] = useState<MovementType>("in")
    const [quantity, setQuantity] = useState("1")
    const [reason, setReason] = useState("")
    const [isPurchase, setIsPurchase] = useState(false)

    const [payeeId, setPayeeId] = useState("none")
    const [categoryId, setCategoryId] = useState("none")
    const [bankAccountId, setBankAccountId] = useState("none")
    const [total, setTotal] = useState(maskCurrency("0"))
    const [dueDate, setDueDate] = useState(todayInputValue())
    const [paymentMethod, setPaymentMethod] = useState("none")
    const [installmentCount, setInstallmentCount] = useState("1")
    const [installmentMode, setInstallmentMode] = useState<InstallmentMode>("installment")

    const { singleProduct } = useProducts(productId)
    const { payees } = usePayees()
    const { bankAccounts } = useBankAccounts()
    const { expenseCategories } = useExpenseCategories()
    const {
        createStockMovement,
        createStockMovementIsPending,
        createPurchase,
        createPurchaseIsPending,
    } = useStock()

    function reset() {
        setStep("movement")
        setType("in")
        setQuantity("1")
        setReason("")
        setIsPurchase(false)
        setPayeeId("none")
        setCategoryId("none")
        setBankAccountId("none")
        setTotal(maskCurrency("0"))
        setDueDate(todayInputValue())
        setPaymentMethod("none")
        setInstallmentCount("1")
        setInstallmentMode("installment")
    }

    useEffect(() => {
        if (!isPurchase) return

        const parsedQuantity = Number(quantity)
        const unitPrice = singleProduct?.buyPrice ?? 0

        if (Number.isFinite(parsedQuantity) && parsedQuantity > 0 && unitPrice > 0) {
            setTotal(maskCurrency(String(unitPrice * parsedQuantity)))
        }
    }, [isPurchase, quantity, singleProduct?.buyPrice])

    const parsedQuantity = Number(quantity)
    const totalInCents = Number(total.replace(/\D/g, ""))
    const parsedInstallments = Math.max(1, Math.min(60, Number(installmentCount) || 1))

    function handleMovementSubmit() {
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            toast.error("informe uma quantidade válida")
            return
        }

        if (type === "in" && isPurchase) {
            setStep("payable")
            return
        }

        void submitMovement()
    }

    async function submitMovement() {
        try {
            await createStockMovement({
                productId,
                type,
                quantity: parsedQuantity,
                reason: reason || "ajuste manual",
            })
            toast.success("estoque atualizado")
            setOpen(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao movimentar estoque"))
        }
    }

    async function submitPurchase(createPayable: boolean) {
        if (createPayable && totalInCents <= 0) {
            toast.error("informe o valor total da compra")
            return
        }

        try {
            await createPurchase({
                productId,
                quantity: parsedQuantity,
                reason: reason || "compra",
                createPayable,
                payeeId: payeeId === "none" ? null : payeeId,
                categoryId: categoryId === "none" ? null : categoryId,
                bankAccountId: bankAccountId === "none" ? null : bankAccountId,
                amount: createPayable ? totalInCents : undefined,
                dueDate: createPayable ? dueDate : undefined,
                paymentMethod: createPayable && paymentMethod !== "none"
                    ? paymentMethod as (typeof paymentMethodOptions)[number]["value"]
                    : null,
                installments: createPayable
                    ? {
                        count: parsedInstallments,
                        mode: parsedInstallments > 1 ? installmentMode : undefined,
                    }
                    : undefined,
            })
            toast.success(createPayable
                ? "compra registrada e lançamento criado"
                : "compra registrada no estoque")
            setOpen(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao registrar compra"))
        }
    }

    const isPending = createStockMovementIsPending || createPurchaseIsPending

    return (
        <Dialog open={open} onOpenChange={(next) => {
            setOpen(next)
            if (!next) reset()
        }}>
            <DialogTrigger asChild>
                <Button className="w-full" variant="secondary"><PlusIcon />movimentar estoque</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                {step === "movement" ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>movimentar estoque</DialogTitle>
                            <DialogDescription>registre uma entrada, saída ou ajuste manual</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label>tipo</Label>
                                <Select value={type} onValueChange={(value: MovementType) => setType(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in">entrada</SelectItem>
                                        <SelectItem value="out">saída</SelectItem>
                                        <SelectItem value="adjustment">ajuste</SelectItem>
                                        <SelectItem value="transfer">transferência</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="quantity">quantidade</Label>
                                <Input id="quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                            </div>
                            <div className="col-span-2 flex flex-col gap-2">
                                <Label htmlFor="reason">motivo</Label>
                                <Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} />
                            </div>
                            {type === "in" && (
                                <div className="col-span-2 flex items-center gap-2 rounded-lg border p-3">
                                    <input
                                        id="is-purchase"
                                        type="checkbox"
                                        className="size-4"
                                        checked={isPurchase}
                                        onChange={(event) => setIsPurchase(event.target.checked)}
                                    />
                                    <Label htmlFor="is-purchase">esta entrada é uma compra de produtos</Label>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button disabled={isPending} onClick={handleMovementSubmit}>confirmar</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>lançar no contas a pagar?</DialogTitle>
                            <DialogDescription>
                                deseja criar um lançamento no Contas a Pagar para esta compra?
                                ajuste o vencimento, as parcelas e a forma antes de confirmar.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <Label>favorecido</Label>
                                    <Select value={payeeId} onValueChange={setPayeeId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="fornecedor" />
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
                                    <Label htmlFor="purchase-total">valor total</Label>
                                    <Input
                                        id="purchase-total"
                                        inputMode="numeric"
                                        value={total}
                                        onChange={(event) => setTotal(maskCurrency(event.target.value))}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label>categoria</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="compra de produtos" />
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
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="purchase-due-date">vencimento</Label>
                                    <Input
                                        id="purchase-due-date"
                                        type="date"
                                        value={dueDate}
                                        onChange={(event) => setDueDate(event.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="purchase-installments">parcelas</Label>
                                    <Input
                                        id="purchase-installments"
                                        type="number"
                                        min={1}
                                        max={60}
                                        value={installmentCount}
                                        onChange={(event) => setInstallmentCount(event.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label>modo</Label>
                                    <Select
                                        value={installmentMode}
                                        onValueChange={(value) => setInstallmentMode(value as InstallmentMode)}
                                    >
                                        <SelectTrigger className="w-full" disabled={parsedInstallments <= 1}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="installment">dividir o valor total</SelectItem>
                                            <SelectItem value="recurring">repetir o valor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label>forma de pagamento</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="prevista" />
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
                                    <Label>conta bancária</Label>
                                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                                        <SelectTrigger className="w-full">
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
                            <p className="text-xs text-muted-foreground">
                                {parsedInstallments > 1
                                    ? installmentMode === "installment"
                                        ? `${parsedInstallments} parcelas mensais dividindo ${formatCurrency(totalInCents)}`
                                        : `${parsedInstallments} lançamentos mensais de ${formatCurrency(totalInCents)}`
                                    : `lançamento único de ${formatCurrency(totalInCents)} com vencimento em ${dueDate}`}
                            </p>
                        </div>

                        <DialogFooter className="sm:justify-between">
                            <Button variant="ghost" onClick={() => setStep("movement")}>
                                voltar
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => submitPurchase(false)}
                                >
                                    não, apenas estoque
                                </Button>
                                <Button disabled={isPending} onClick={() => submitPurchase(true)}>
                                    {isPending ? "registrando..." : "sim, criar lançamento"}
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

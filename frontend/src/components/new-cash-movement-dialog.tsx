import { useState } from "react"
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
import { BanknoteArrowDown, BanknoteArrowUp } from "lucide-react"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { maskCurrency } from "@/utils/finance"
import { Textarea } from "./ui/textarea"
import { useCashMovements } from "@/hooks/use-cash-movements"
import { toast } from "sonner"

interface NewCashMovementDialogProps {
    type: "topup" | "drop"
    cashId: string
}

export default function NewCashMovementDialog({ type, cashId }: NewCashMovementDialogProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState<string>("0")
    const [description, setDescription] = useState<string>("")
    const { createMovement, createMovementIsPending } = useCashMovements()

    async function handleCashMovement() {
        const clearAmount = amount.replace(/\D/g, '')

        createMovement({
            amount: Number(clearAmount),
            description,
            cashId,
            type
        })

        toast.success("operação realizada com sucesso")
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className={`w-full ${type === "topup" ? "bg-green-500" : "bg-red-500"}`}>{type === "topup" ? (
                    <>
                        <BanknoteArrowUp /> suprimento
                    </>
                ) : (
                    <>
                        <BanknoteArrowDown /> sangria
                    </>
                )}</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{type === "topup" ? "suprir caixa" : "sangrar caixa"}</DialogTitle>
                    <DialogDescription>
                        insira o valor e a descrição da operação
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <Label htmlFor="amount">valor</Label>
                    <Input
                        id="amount"
                        value={amount}
                        onChange={(e) => {
                            setAmount(maskCurrency(e.target.value))
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="description">descrição</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        maxLength={256}
                    />
                </div>
                <DialogFooter>
                    <Button
                        disabled={createMovementIsPending}
                        onClick={() => handleCashMovement()}>confirmar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )

}

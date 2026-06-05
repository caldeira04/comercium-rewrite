import { useState } from "react"
import { toast } from "sonner"
import { LockIcon } from "lucide-react"
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
import { useCash } from "@/hooks/use-cash"
import { maskCurrency } from "@/utils/finance"
import { getApiErrorMessage } from "@/lib/api-error"

export default function CloseCashDialog({ cashId }: { cashId: string }) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState("R$ 0,00")
    const { closeCash, closeCashIsPending } = useCash()

    async function handleClose() {
        try {
            await closeCash({
                cashId,
                actualClosingAmount: Number(amount.replace(/\D/g, "")),
            })
            toast.success("caixa fechado com sucesso")
            setOpen(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao fechar caixa"))
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full" variant="destructive"><LockIcon />fechar caixa</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>fechar caixa</DialogTitle>
                    <DialogDescription>informe o valor contado em dinheiro para encerrar o caixa</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="actualClosingAmount">valor contado</Label>
                    <Input id="actualClosingAmount" value={amount} onChange={(event) => setAmount(maskCurrency(event.target.value))} />
                </div>
                <DialogFooter>
                    <Button disabled={closeCashIsPending} onClick={handleClose}>confirmar fechamento</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

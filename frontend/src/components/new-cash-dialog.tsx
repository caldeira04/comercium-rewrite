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
import { LandmarkIcon } from "lucide-react"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { maskCurrency } from "@/utils/finance"
import { useCash } from "@/hooks/use-cash"

export default function NewCashDialog() {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState<string>("0")
    const { createCash, createCashIsPending } = useCash()

    async function handleOpenCash() {
        const clearAmount = amount.replace(/\D/g, '')

        await createCash({
            openingAmount: Number(clearAmount)
        })
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><LandmarkIcon />abrir caixa</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>abrir caixa</DialogTitle>
                    <DialogDescription>
                        insira o valor do fundo de caixa
                    </DialogDescription>
                </DialogHeader>
                <Label htmlFor="amount">fundo de caixa</Label>
                <Input
                    id="amount"
                    value={amount}
                    onChange={(e) => {
                        setAmount(maskCurrency(e.target.value))
                    }}
                />
                <DialogFooter>
                    <Button
                        disabled={createCashIsPending}
                        onClick={() => handleOpenCash()}>abrir caixa</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )

}

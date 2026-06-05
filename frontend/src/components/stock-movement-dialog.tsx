import { useState } from "react"
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
import { getApiErrorMessage } from "@/lib/api-error"

export default function StockMovementDialog({ productId }: { productId: number }) {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState<"in" | "out" | "adjustment" | "transfer">("in")
    const [quantity, setQuantity] = useState("1")
    const [reason, setReason] = useState("")
    const { createStockMovement, createStockMovementIsPending } = useStock()

    async function handleSubmit() {
        const parsedQuantity = Number(quantity)
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            toast.error("informe uma quantidade válida")
            return
        }

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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full" variant="secondary"><PlusIcon />movimentar estoque</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>movimentar estoque</DialogTitle>
                    <DialogDescription>registre uma entrada, saída ou ajuste manual</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <Label>tipo</Label>
                        <Select value={type} onValueChange={(value: "in" | "out" | "adjustment" | "transfer") => setType(value)}>
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
                </div>
                <DialogFooter>
                    <Button disabled={createStockMovementIsPending} onClick={handleSubmit}>confirmar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

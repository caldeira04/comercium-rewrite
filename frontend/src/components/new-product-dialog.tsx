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
import { useProducts } from "@/hooks/use-products"
import { useCategories } from "@/hooks/use-categories"
import { maskCurrency } from "@/utils/finance"
import { getApiErrorMessage } from "@/lib/api-error"

export default function NewProductDialog() {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [gtin, setGtin] = useState("")
    const [buyPrice, setBuyPrice] = useState("R$ 0,00")
    const [sellPrice, setSellPrice] = useState("R$ 0,00")
    const [categoryId, setCategoryId] = useState<string>("none")
    const { createProduct, createProductIsPending } = useProducts()
    const { categories } = useCategories()

    async function handleSubmit() {
        if (!name.trim()) {
            toast.error("informe o nome do produto")
            return
        }

        try {
            await createProduct({
                name: name.trim(),
                gtin: gtin.trim(),
                buyPrice: Number(buyPrice.replace(/\D/g, "")),
                sellPrice: Number(sellPrice.replace(/\D/g, "")),
                categoryId: categoryId === "none" ? undefined : Number(categoryId),
            })

            toast.success("produto cadastrado com sucesso")
            setName("")
            setGtin("")
            setBuyPrice("R$ 0,00")
            setSellPrice("R$ 0,00")
            setCategoryId("none")
            setOpen(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao cadastrar produto"))
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PlusIcon />novo produto</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>novo produto</DialogTitle>
                    <DialogDescription>cadastre o item para venda e controle de estoque</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 flex flex-col gap-2">
                        <Label htmlFor="name">nome</Label>
                        <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
                    </div>
                    <div className="col-span-2 flex flex-col gap-2">
                        <Label htmlFor="gtin">GTIN/código de barras</Label>
                        <Input id="gtin" value={gtin} onChange={(event) => setGtin(event.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="buyPrice">custo</Label>
                        <Input id="buyPrice" value={buyPrice} onChange={(event) => setBuyPrice(maskCurrency(event.target.value))} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="sellPrice">venda</Label>
                        <Input id="sellPrice" value={sellPrice} onChange={(event) => setSellPrice(maskCurrency(event.target.value))} />
                    </div>
                    <div className="col-span-2 flex flex-col gap-2">
                        <Label>categoria</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger>
                                <SelectValue placeholder="selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">sem categoria</SelectItem>
                                {(categories ?? []).map((category) => (
                                    <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button disabled={createProductIsPending} onClick={handleSubmit}>salvar produto</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

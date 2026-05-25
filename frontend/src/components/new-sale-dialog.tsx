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
import { PlusIcon } from "lucide-react"

export default function NewSaleDialog() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PlusIcon />nova venda</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>nova venda</DialogTitle>
                    <DialogDescription>
                        escolha o cliente para o qual a venda será realizada
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )

}

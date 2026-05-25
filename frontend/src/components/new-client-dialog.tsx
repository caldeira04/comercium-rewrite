import { useState } from "react"
import { useClients } from "@/hooks/use-clients"
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
import NewClientForm from "./new-client-form"


export default function NewClientDialog() {
    const [open, setOpen] = useState(false)
    const { createClientIsPending } = useClients()

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PlusIcon />novo cliente</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>cadastrar novo cliente</DialogTitle>
                    <DialogDescription>
                        preencha os dados básicos para vincular vendas ao cliente
                    </DialogDescription>
                </DialogHeader>
                <NewClientForm onClose={() => setOpen(false)} />
                <DialogFooter>
                    <Button
                        type="submit"
                        form="new-client-form"
                        disabled={createClientIsPending}
                    >
                        {createClientIsPending ? "cadastrando..." : "cadastrar cliente"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )

}

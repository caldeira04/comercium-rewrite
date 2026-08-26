import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

type ConfirmDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    requireText?: string
    isPending?: boolean
    onConfirm: () => void
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "confirmar",
    requireText,
    isPending = false,
    onConfirm,
}: ConfirmDialogProps) {
    const [typed, setTyped] = useState("")
    const confirmed = !requireText || typed === requireText

    return (
        <Dialog open={open} onOpenChange={(next) => {
            if (!next) setTyped("")
            onOpenChange(next)
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {requireText && (
                    <div className="flex flex-col gap-2">
                        <span className="text-sm text-muted-foreground">
                            Digite <strong className="text-foreground">{requireText}</strong> para confirmar.
                        </span>
                        <Input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={requireText}
                            autoComplete="off"
                        />
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>cancelar</Button>
                    <Button
                        variant="destructive"
                        disabled={!confirmed || isPending}
                        onClick={() => {
                            onConfirm()
                            setTyped("")
                        }}
                    >
                        {isPending ? <Spinner /> : null}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
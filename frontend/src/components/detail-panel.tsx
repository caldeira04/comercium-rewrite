import type { ReactNode } from "react"
import { useIsDesktop } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"

interface DetailPanelProps {
    /** Há um item selecionado (abre o painel em telas pequenas). */
    open: boolean
    /** Chamado ao fechar o painel em telas pequenas; normalmente limpa a seleção. */
    onClose: () => void
    title: string
    /** Classes da coluna lateral em telas grandes (ex.: largura). */
    className?: string
    children: ReactNode
}

/**
 * Painel de detalhes das telas de listagem: coluna fixa ao lado da lista em
 * telas grandes e um Sheet que abre ao selecionar um item em telas menores.
 */
export function DetailPanel({ open, onClose, title, className, children }: DetailPanelProps) {
    const isDesktop = useIsDesktop()

    if (isDesktop) {
        return <div className={cn("shrink-0", className)}>{children}</div>
    }

    return (
        <Sheet open={open} onOpenChange={(next) => { if (!next) onClose() }}>
            <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 pt-12 sm:max-w-md">
                <SheetHeader className="sr-only">
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>Detalhes do item selecionado</SheetDescription>
                </SheetHeader>
                <div className="flex min-h-0 flex-1 flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [&>[data-slot=card]]:border-0 [&>[data-slot=card]]:py-2">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    )
}

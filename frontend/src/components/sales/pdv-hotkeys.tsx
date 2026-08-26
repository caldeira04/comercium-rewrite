import { cn } from "@/lib/utils"
import type { CurrentSale } from "@/lib/api-types"
import { KeyboardIcon } from "lucide-react"

interface PdvHotkeysProps {
    show: boolean
    onToggle: () => void
    sale: CurrentSale | null
    pendingTotal: number
    hasSelection: boolean
}

interface Shortcut {
    keys: string
    label: string
    active: boolean
}

export function PdvHotkeys({
    show,
    onToggle,
    sale,
    pendingTotal,
    hasSelection,
}: PdvHotkeysProps) {
    const shortcuts: Shortcut[] = [
        { keys: "F1", label: "iniciar venda", active: !sale },
        { keys: "F2", label: "buscar produto", active: !!sale },
        {
            keys: "F3",
            label: "editar último item",
            active: !!sale?.saleItem.some((item) => !item.deletedAt),
        },
        { keys: "F4", label: "buscar cliente", active: !!sale },
        {
            keys: "F8",
            label: "finalizar venda",
            active: !!sale && pendingTotal > 0,
        },
        { keys: "Enter", label: "confirmar produto", active: hasSelection },
        { keys: "+/−", label: "quantidade", active: hasSelection },
        { keys: "Esc", label: "cancelar / fechar", active: hasSelection },
    ]

    return (
        <div className="flex w-full shrink-0 flex-col border-t border-border bg-muted/30">
            {show ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-1.5">
                    {shortcuts.map((shortcut) => (
                        <span
                            key={shortcut.keys}
                            className={cn(
                                "flex items-center gap-1 text-xs text-muted-foreground",
                                !shortcut.active && "opacity-50",
                            )}
                        >
                            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                                {shortcut.keys}
                            </kbd>
                            {shortcut.label}
                        </span>
                    ))}
                    <button
                        type="button"
                        onClick={onToggle}
                        className="ml-auto rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        ocultar
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex w-full items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <KeyboardIcon className="size-3.5" />
                    atalhos de teclado
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                        Shift+/
                    </kbd>
                </button>
            )}
        </div>
    )
}
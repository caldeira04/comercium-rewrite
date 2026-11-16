import { useId } from "react"
import { RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ReportFiltersProps = {
    /** Informe as datas para exibir o filtro de período. */
    startDate?: string
    endDate?: string
    onPeriodChange?: (patch: { startDate?: string, endDate?: string }) => void
    invalidRange?: boolean
    onReset: () => void
    /** Filtros específicos da tela (normalmente `FilterSelect`). */
    children?: React.ReactNode
    /** Botões à direita do "limpar", como exportar PDF. */
    actions?: React.ReactNode
}

/** Barra de filtros padrão dos relatórios: período, filtros da tela e limpar. */
export function ReportFilters({
    startDate,
    endDate,
    onPeriodChange,
    invalidRange,
    onReset,
    children,
    actions,
}: ReportFiltersProps) {
    const id = useId()
    const hasPeriod = startDate !== undefined && endDate !== undefined

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end gap-2">
                {hasPeriod && (
                    <>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor={`${id}-start`}>data inicial</Label>
                            <Input
                                id={`${id}-start`}
                                className="w-40"
                                type="date"
                                value={startDate}
                                max={endDate}
                                onChange={(event) => onPeriodChange?.({ startDate: event.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor={`${id}-end`}>data final</Label>
                            <Input
                                id={`${id}-end`}
                                className="w-40"
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(event) => onPeriodChange?.({ endDate: event.target.value })}
                            />
                        </div>
                    </>
                )}
                {children}
                <Button variant="outline" onClick={onReset}>
                    <RotateCcwIcon />
                    limpar
                </Button>
                {actions}
            </div>
            {invalidRange && (
                <p className="text-sm text-destructive">
                    a data inicial deve ser anterior ou igual à data final
                </p>
            )}
        </div>
    )
}

type FilterSelectProps = {
    label: string
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string, label: string }>
    className?: string
}

export function FilterSelect({ label, value, onChange, options, className }: FilterSelectProps) {
    return (
        <div className="flex flex-col gap-1">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className={cn("w-44", className)}>
                    <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

export const PAYMENT_METHOD_OPTIONS = [
    { value: "all", label: "todas as formas" },
    { value: "cash", label: "dinheiro" },
    { value: "pix", label: "PIX" },
    { value: "debit", label: "débito" },
    { value: "credit", label: "crédito" },
    { value: "voucher", label: "cheque" },
]

export function clientOptions(clients?: Array<{ id: number, name: string }> | null) {
    return [
        { value: "all", label: "todos os clientes" },
        { value: "none", label: "não informado" },
        ...(clients ?? []).map((client) => ({ value: String(client.id), label: client.name })),
    ]
}

export const CASH_STATUS_OPTIONS = [
    { value: "all", label: "todos" },
    { value: "open", label: "abertos" },
    { value: "closed", label: "fechados" },
]

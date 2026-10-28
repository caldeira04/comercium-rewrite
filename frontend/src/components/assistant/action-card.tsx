import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { AlertTriangleIcon, CheckIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AssistantAction, AssistantActionValues } from "@/hooks/use-assistant"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"
import { formatCurrency, maskCurrency } from "@/utils/finance"
import { formatDateInput } from "@/utils/time"

type ActionField = AssistantAction["fields"][number]
type ActionValue = AssistantActionValues[string]
type ActionRow = Extract<ActionValue, unknown[]>[number]
type ActionScalar = Exclude<ActionValue, unknown[]>

const EMPTY_SELECT = "__none__"

const statusLabels: Record<AssistantAction["status"], string> = {
    proposed: "aguardando confirmação",
    executing: "executando",
    executed: "feito",
    rejected: "cancelado",
    expired: "expirado",
    failed: "falhou",
}

const resultLinks: Record<string, { to: string, label: string }> = {
    payable: { to: "/finance/payables", label: "Ver em Contas a Pagar" },
    client: { to: "/clients", label: "Ver em Clientes" },
    product: { to: "/products/list", label: "Ver em Produtos" },
    stock_movement: { to: "/products/list", label: "Ver em Produtos" },
    cash_movement: { to: "/cash/current", label: "Ver no Caixa" },
    payee: { to: "/finance/payables", label: "Ver em Contas a Pagar" },
    expense_category: { to: "/finance/payables", label: "Ver em Contas a Pagar" },
}

function displayValue(field: ActionField, value: ActionValue | undefined) {
    if (value === null || value === undefined || value === "") return "—"
    if (Array.isArray(value)) {
        return `${value.filter((row) => row.include !== false).length} de ${value.length} linhas`
    }
    if (field.kind === "boolean") return value ? "sim" : "não"
    if (field.kind === "money" && typeof value === "number") return formatCurrency(value)
    if (field.kind === "date" && typeof value === "string") return formatDateInput(value)
    if (field.kind === "select") {
        return field.options?.find((option) => option.value === String(value))?.label ?? String(value)
    }

    return String(value)
}

function FieldInput({ field, value, disabled, onChange, id = `action-field-${field.key}` }: {
    field: ActionField
    value: ActionScalar | undefined
    disabled: boolean
    onChange: (value: ActionScalar) => void
    id?: string
}) {
    if (field.kind === "boolean") {
        return (
            <input
                id={id}
                type="checkbox"
                className="size-4 accent-primary"
                checked={value === true}
                onChange={(event) => onChange(event.target.checked)}
                disabled={disabled}
            />
        )
    }

    if (field.kind === "select") {
        return (
            <Select
                value={value === null || value === undefined ? EMPTY_SELECT : String(value)}
                onValueChange={(selected) => onChange(selected === EMPTY_SELECT ? null : selected)}
                disabled={disabled}
            >
                <SelectTrigger id={id} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {!field.required && <SelectItem value={EMPTY_SELECT}>nenhum</SelectItem>}
                    {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }

    if (field.kind === "money") {
        return (
            <Input
                id={id}
                inputMode="numeric"
                value={maskCurrency(String(typeof value === "number" ? value : 0))}
                onChange={(event) => onChange(Number(event.target.value.replace(/\D/g, "")))}
                disabled={disabled}
            />
        )
    }

    if (field.kind === "integer") {
        return (
            <Input
                id={id}
                type="number"
                min={1}
                step={1}
                value={typeof value === "number" ? value : ""}
                onChange={(event) => onChange(event.target.value === "" ? null : Math.trunc(Number(event.target.value)))}
                disabled={disabled}
            />
        )
    }

    if (field.kind === "textarea") {
        return (
            <Textarea
                id={id}
                rows={2}
                value={typeof value === "string" ? value : ""}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
            />
        )
    }

    return (
        <Input
            id={id}
            type={field.kind === "date" ? "date" : "text"}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
        />
    )
}

// Tabela do cartão em lote: uma linha por item, com caixa para incluir ou não
function RowsTable({ field, rows, editable, disabled, onChange }: {
    field: ActionField
    rows: ActionRow[]
    editable: boolean
    disabled: boolean
    onChange: (rows: ActionRow[]) => void
}) {
    const columns = (field.columns ?? []).filter((column) => editable || column.kind !== "boolean")
    const shownRows = editable ? rows : rows.filter((row) => row.include !== false)

    function updateRow(index: number, key: string, value: ActionScalar) {
        onChange(rows.map((row, current) => current === index ? { ...row, [key]: value } : row))
    }

    return (
        <div className="max-w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} className="border-b px-1.5 py-1 font-medium text-muted-foreground">
                                {column.kind === "boolean" ? <span className="sr-only">{column.label}</span> : column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {shownRows.map((row, index) => (
                        <tr key={index} className={cn(row.include === false && "opacity-50")}>
                            {columns.map((column) => (
                                <td key={column.key} className="border-b px-1.5 py-1 align-middle">
                                    {editable && !column.readOnly ? (
                                        <div className={cn(column.kind !== "boolean" && "min-w-28")}>
                                            <FieldInput
                                                id={`action-field-${field.key}-${index}-${column.key}`}
                                                field={column}
                                                value={row[column.key]}
                                                disabled={disabled || (column.kind !== "boolean" && row.include === false)}
                                                onChange={(value) => updateRow(index, column.key, value)}
                                            />
                                        </div>
                                    ) : (
                                        displayValue(column, row[column.key])
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function ActionCard({ action, onConfirm, onReject }: {
    action: AssistantAction
    onConfirm: (values: AssistantActionValues) => Promise<AssistantAction>
    onReject: () => Promise<AssistantAction>
}) {
    const [values, setValues] = useState<AssistantActionValues>(action.values)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string>()

    const isExpired = action.status === "proposed" && Date.parse(action.expiresAt) <= Date.now()
    const status = isExpired ? "expired" : action.status
    const isEditable = status === "proposed"
    const shownValues = isEditable ? values : action.values
    const link = action.result ? resultLinks[action.result.referenceType] : undefined

    // Nas ações de edição, mostra o valor anterior dos campos alterados
    function previousOf(field: ActionField) {
        const previous = action.previousValues
        if (field.kind === "rows" || !previous || !(field.key in previous)) return undefined
        if ((previous[field.key] ?? null) === (shownValues[field.key] ?? null)) return undefined
        return displayValue(field, previous[field.key])
    }

    async function decide(decision: () => Promise<AssistantAction>) {
        setIsSubmitting(true)
        setError(undefined)
        try {
            await decision()
        } catch (caught) {
            setError(getApiErrorMessage(caught, "Não foi possível concluir a ação."))
        } finally {
            setIsSubmitting(false)
        }
    }

    function confirm() {
        const editable = Object.fromEntries(
            action.fields.filter((field) => !field.readOnly).map((field) => [field.key, values[field.key] ?? null])
        )
        void decide(() => onConfirm(editable))
    }

    return (
        <section
            aria-label={action.title}
            className={cn(
                "w-full max-w-[85%] rounded-xl border bg-card p-4 text-sm",
                status === "proposed" && "border-primary/40",
                status === "failed" && "border-destructive/40"
            )}
        >
            <header className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">{action.title}</h3>
                <Badge variant={status === "executed" ? "default" : status === "failed" ? "destructive" : "outline"}>
                    {statusLabels[status]}
                </Badge>
            </header>

            {isEditable && action.warnings.length > 0 && (
                <ul className="mb-3 space-y-1 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                    {action.warnings.map((warning) => (
                        <li key={warning} className="flex items-start gap-1.5">
                            <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
                            {warning}
                        </li>
                    ))}
                </ul>
            )}

            {isEditable ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {action.fields.map((field) => (
                        <div
                            key={field.key}
                            className={cn("flex flex-col gap-1.5", (field.kind === "textarea" || field.kind === "rows") && "sm:col-span-2")}
                        >
                            <Label htmlFor={`action-field-${field.key}`} className="text-xs text-muted-foreground">
                                {field.label}{field.required && !field.readOnly ? " *" : ""}
                            </Label>
                            {field.kind === "rows" ? (
                                <RowsTable
                                    field={field}
                                    rows={Array.isArray(shownValues[field.key]) ? shownValues[field.key] as ActionRow[] : []}
                                    editable
                                    disabled={isSubmitting}
                                    onChange={(rows) => setValues((current) => ({ ...current, [field.key]: rows }))}
                                />
                            ) : field.readOnly ? (
                                <p className="py-1.5">{displayValue(field, shownValues[field.key])}</p>
                            ) : (
                                <FieldInput
                                    field={field}
                                    value={shownValues[field.key] as ActionScalar | undefined}
                                    disabled={isSubmitting}
                                    onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                                />
                            )}
                            {previousOf(field) !== undefined && (
                                <span className="text-xs text-muted-foreground">antes: {previousOf(field)}</span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
                    {action.fields
                        .filter((field) => shownValues[field.key] !== null && shownValues[field.key] !== "")
                        .map((field) => field.kind === "rows" ? (
                            <div key={field.key} className="sm:col-span-2">
                                <RowsTable
                                    field={field}
                                    rows={Array.isArray(shownValues[field.key]) ? shownValues[field.key] as ActionRow[] : []}
                                    editable={false}
                                    disabled
                                    onChange={() => undefined}
                                />
                            </div>
                        ) : (
                            <div key={field.key} className="contents">
                                <dt className="text-muted-foreground">{field.label}</dt>
                                <dd>
                                    {previousOf(field) !== undefined && (
                                        <span className="text-muted-foreground line-through">{previousOf(field)}</span>
                                    )}
                                    {previousOf(field) !== undefined && " → "}
                                    {displayValue(field, shownValues[field.key])}
                                </dd>
                            </div>
                        ))}
                </dl>
            )}

            {(error || action.error) && (
                <p className="mt-3 text-xs text-destructive" role="alert">{error ?? action.error}</p>
            )}

            {isEditable && (
                <footer className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <span className="mr-auto text-xs text-muted-foreground">
                        Nada foi gravado ainda. Válido até {new Date(action.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.
                    </span>
                    <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => void decide(onReject)}>
                        <XIcon />
                        Cancelar
                    </Button>
                    <Button type="button" size="sm" disabled={isSubmitting} onClick={confirm}>
                        <CheckIcon />
                        {isSubmitting ? "Executando…" : "Confirmar"}
                    </Button>
                </footer>
            )}

            {status === "executed" && link && (
                <Link to={link.to} className="mt-3 inline-block text-xs text-primary underline underline-offset-4">
                    {link.label}
                </Link>
            )}
        </section>
    )
}

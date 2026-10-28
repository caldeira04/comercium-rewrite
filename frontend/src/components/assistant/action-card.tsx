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
}

function displayValue(field: ActionField, value: AssistantActionValues[string]) {
    if (value === null || value === undefined || value === "") return "—"
    if (field.kind === "money" && typeof value === "number") return formatCurrency(value)
    if (field.kind === "date" && typeof value === "string") return formatDateInput(value)
    if (field.kind === "select") {
        return field.options?.find((option) => option.value === String(value))?.label ?? String(value)
    }

    return String(value)
}

function FieldInput({ field, value, disabled, onChange }: {
    field: ActionField
    value: AssistantActionValues[string]
    disabled: boolean
    onChange: (value: AssistantActionValues[string]) => void
}) {
    const id = `action-field-${field.key}`

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
                            className={cn("flex flex-col gap-1.5", field.kind === "textarea" && "sm:col-span-2")}
                        >
                            <Label htmlFor={`action-field-${field.key}`} className="text-xs text-muted-foreground">
                                {field.label}{field.required && !field.readOnly ? " *" : ""}
                            </Label>
                            {field.readOnly ? (
                                <p className="py-1.5">{displayValue(field, shownValues[field.key])}</p>
                            ) : (
                                <FieldInput
                                    field={field}
                                    value={shownValues[field.key]}
                                    disabled={isSubmitting}
                                    onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                                />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
                    {action.fields
                        .filter((field) => shownValues[field.key] !== null && shownValues[field.key] !== "")
                        .map((field) => (
                            <div key={field.key} className="contents">
                                <dt className="text-muted-foreground">{field.label}</dt>
                                <dd>{displayValue(field, shownValues[field.key])}</dd>
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

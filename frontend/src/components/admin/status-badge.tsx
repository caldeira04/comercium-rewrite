import { Badge } from "@/components/ui/badge"

type StatusProps = {
    active: boolean
    deleted?: boolean
}

export function StatusBadge({ active, deleted = false }: StatusProps) {
    if (deleted) return <Badge variant="destructive">excluído</Badge>
    if (active) return <Badge variant="secondary">ativo</Badge>
    return <Badge variant="outline">inativo</Badge>
}

export function SubscriptionBadge({ status, planId }: { status: string | null, planId: string | null }) {
    const label = status ?? "sem assinatura"
    const variant = status
        ? status.toLowerCase() === "cancelled"
            ? "destructive"
            : status.toLowerCase() === "past_due" || status.toLowerCase() === "overdue"
                ? "outline"
                : "secondary"
        : "outline"

    return (
        <div className="flex items-center gap-1.5">
            <Badge variant={variant}>{label}</Badge>
            {planId && <span className="text-xs text-muted-foreground">{planId}</span>}
        </div>
    )
}
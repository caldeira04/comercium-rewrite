import { Card, CardContent } from "@/components/ui/card"

export function Metric({ label, value, detail }: { label: string, value: string, detail: string }) {
    return (
        <Card>
            <CardContent>
                <p className="text-xs uppercase text-muted-foreground md:text-sm">{label}</p>
                <p className="truncate text-lg font-bold tabular-nums md:text-2xl">{value}</p>
                <p className="text-xs text-muted-foreground md:text-sm">{detail}</p>
            </CardContent>
        </Card>
    )
}
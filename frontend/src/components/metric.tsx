import { Card, CardContent } from "@/components/ui/card"

export function Metric({ label, value, detail }: { label: string, value: string, detail: string }) {
    return (
        <Card>
            <CardContent>
                <p className="text-sm uppercase text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    )
}
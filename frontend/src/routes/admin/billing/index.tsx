import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"
import type { BillingSummary } from "@/lib/admin-api-types"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Metric } from "@/components/metric"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useAdminBilling } from "@/hooks/use-admin"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/billing/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { data, isPending, isError } = useAdminBilling()

    if (isPending) return <Spinner />
    if (isError) return <p className="text-muted-foreground">não foi possível carregar as assinaturas</p>

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">assinaturas</h1>
                <p className="text-muted-foreground">planos e status de assinatura dos tenants</p>
            </div>

            <Card>
                <CardContent className="text-sm text-muted-foreground">
                    receita mensal (MRR) não está disponível: os preços dos planos ainda não são modelados no
                    backend. os dados abaixo refletem apenas os campos de assinatura existentes
                    (plano, status e data de expiração).
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <Metric label="assinaturas ativas" value={String(data.activeSubscriptions)} detail="com status não cancelado" />
                <Metric label="expiradas" value={String(data.expired.length)} detail="assinatura vencida" />
                <Metric label="a expirar (7d)" value={String(data.dueSoon.length)} detail="próximos 7 dias" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <DistributionCard title="distribuição por plano" data={data.planDistribution} />
                <DistributionCard title="distribuição por status" data={data.statusDistribution} />
            </div>

            <TenantListCard title="assinaturas expiradas" tenants={data.expired} />
            <TenantListCard title="a expirar nos próximos 7 dias" tenants={data.dueSoon} />
            <TenantListCard title="sem plano definido" tenants={data.withoutPlan} />
        </div>
    )
}

function DistributionCard({ title, data }: { title: string, data: Array<{ label: string, value: number }> }) {
    return (
        <Card>
            <CardContent className="flex flex-col gap-2">
                <h2 className="font-bold">{title}</h2>
                {data.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                        <span>{item.label}</span>
                        <span className="font-bold">{item.value}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function TenantListCard({ title, tenants }: { title: string, tenants: BillingSummary["expired"] }) {
    if (tenants.length === 0) return null

    return (
        <Card>
            <CardContent className="flex flex-col gap-3">
                <h2 className="font-bold">{title}</h2>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>tenant</TableHead>
                            <TableHead>plano</TableHead>
                            <TableHead>status</TableHead>
                            <TableHead>expira</TableHead>
                            <TableHead className="text-right">ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tenants.map((tenant) => (
                            <TableRow key={tenant.id}>
                                <TableCell className="font-medium">{tenant.name}</TableCell>
                                <TableCell>{tenant.planId ?? "-"}</TableCell>
                                <TableCell>
                                    <Badge variant={tenant.subscriptionStatusId === "cancelled" ? "destructive" : "outline"}>
                                        {tenant.subscriptionStatusId ?? "sem status"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {tenant.subscriptionExpireDate ? formatTime(new Date(tenant.subscriptionExpireDate)).ddMMyy : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="ghost" size="sm">
                                        <Link to="/admin/tenants/$tenantId" params={{ tenantId: tenant.id }}>
                                            detalhes <ArrowRightIcon className="size-3.5" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
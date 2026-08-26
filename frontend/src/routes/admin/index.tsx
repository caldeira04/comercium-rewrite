import { Link, createFileRoute } from "@tanstack/react-router"
import { AlertTriangleIcon, ArrowRightIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Metric } from "@/components/metric"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useAdminOverview } from "@/hooks/use-admin"
import { formatCurrency } from "@/utils/finance"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { data, isPending, isError } = useAdminOverview()

    if (isPending) return <Spinner />
    if (isError) return <p className="text-muted-foreground">ocorreu um erro ao carregar a visão geral</p>

    const metrics = data.metrics
    const attention = data.needsAttention

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">visão geral</h1>
                <p className="text-muted-foreground">estado atual da plataforma Comercium</p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric label="tenants" value={String(metrics.totalTenants)} detail={`${metrics.activeTenants} ativos · ${metrics.newTenants30d} novos (30d)`} />
                <Metric label="usuários" value={String(metrics.totalUsers)} detail={`${metrics.activeUsers} ativos`} />
                <Metric label="vendas" value={String(metrics.totalSales)} detail={`${formatCurrency(metrics.totalSalesAmount)} processado`} />
                <Metric label="produtos" value={String(metrics.totalProducts)} detail={`${metrics.openCashes} caixas abertos`} />
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric label="vendas hoje" value={String(metrics.salesToday)} detail={formatCurrency(metrics.salesTodayAmount)} />
                <Metric label="erros (24h)" value={String(metrics.errors24h)} detail={`${metrics.errors1h} na última hora`} />
                <Metric label="tenants inativos" value={String(metrics.inactiveTenants)} detail="aguardando atenção" />
                <Metric label="caixas abertos" value={String(metrics.openCashes)} detail="em todo o sistema" />
            </div>

            <AttentionSection attention={attention} />
            <DistributionCards />
            <RecentErrors errors={data.recentErrors} />
        </div>
    )
}

function AttentionSection({ attention }: { attention: Array<{ severity: "high" | "medium" | "low", kind: string, message: string, tenantId?: string }> }) {
    if (attention.length === 0) return null

    return (
        <Card className={attention.some((a) => a.severity === "high") ? "border-destructive/40" : undefined}>
            <CardContent className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 font-bold">
                    <AlertTriangleIcon className="size-4 text-destructive" />
                    precisa de atenção
                </h2>
                {attention.map((item, index) => (
                    <div key={`${item.kind}-${index}`} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                            <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "outline" : "secondary"}>
                                {item.severity}
                            </Badge>
                            <span className="text-sm">{item.message}</span>
                        </div>
                        {item.tenantId && (
                            <Button asChild variant="ghost" size="sm">
                                <Link to="/admin/tenants/$tenantId" params={{ tenantId: item.tenantId }}>
                                    ver <ArrowRightIcon className="size-3.5" />
                                </Link>
                            </Button>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function DistributionCards() {
    const { data } = useAdminOverview()

    if (!data) return null

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card>
                <CardContent className="flex flex-col gap-2">
                    <h2 className="font-bold">distribuição por plano</h2>
                    {data.planDistribution.map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                            <span>{item.label}</span>
                            <span className="font-bold">{item.value}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardContent className="flex flex-col gap-2">
                    <h2 className="font-bold">status de assinatura</h2>
                    {data.subscriptionStatusDistribution.map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                            <span>{item.label}</span>
                            <span className="font-bold">{item.value}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

function RecentErrors({ errors }: { errors: Array<{ id: string, statusCode: number | null, errorCode: string | null, path: string | null, message: string | null, createdAt: string }> }) {
    return (
        <Card>
            <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold">erros recentes do sistema</h2>
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/admin/monitoring">monitoramento <ArrowRightIcon className="size-3.5" /></Link>
                    </Button>
                </div>
                {errors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">nenhum erro registrado nas últimas ocorrências</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>status</TableHead>
                                <TableHead>rota</TableHead>
                                <TableHead>mensagem</TableHead>
                                <TableHead className="text-right">quando</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {errors.slice(0, 8).map((error) => (
                                <TableRow key={error.id}>
                                    <TableCell>
                                        <Badge variant={error.statusCode && error.statusCode >= 500 ? "destructive" : "outline"}>
                                            {error.statusCode ?? "-"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-48 truncate font-mono text-xs">{error.path ?? "-"}</TableCell>
                                    <TableCell className="max-w-64 truncate text-sm">{error.message ?? "-"}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{formatTime(new Date(error.createdAt)).ddMMyy}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
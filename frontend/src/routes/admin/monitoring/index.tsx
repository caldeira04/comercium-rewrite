import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"
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
import { useAdminHealth } from "@/hooks/use-admin"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/monitoring/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { data, isPending, isError } = useAdminHealth()

    if (isPending) return <Spinner />
    if (isError) return <p className="text-muted-foreground">não foi possível carregar o monitoramento</p>

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">monitoramento</h1>
                <p className="text-muted-foreground">saúde da API, bancos de dados e serviços externos</p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric label="api" value={data.api} detail="status do servidor" />
                <Metric label="banco master" value={data.masterDatabase} detail="conexão com o banco central" />
                <Metric label="bancos de tenants" value={`${data.tenantDatabases.total - data.tenantDatabases.missing}/${data.tenantDatabases.total}`} detail={`${data.tenantDatabases.missing} ausentes`} />
                <Metric label="erros (24h)" value={String(data.errors.last24h)} detail={`${data.errors.last1h} na última hora`} />
            </div>

            <Card>
                <CardContent className="flex flex-col gap-2">
                    <h2 className="font-bold">bancos de tenants ausentes</h2>
                    {data.tenantDatabases.missing === 0 ? (
                        <p className="text-sm text-muted-foreground">todos os bancos de tenants estão acessíveis</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>tenant</TableHead>
                                    <TableHead>slug</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.tenantDatabases.missingTenants.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{t.slug ?? "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold">serviços externos</h2>
                        <span className="text-xs text-muted-foreground">não configurados nesta instância</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        {Object.entries(data.services).map(([key, value]: [string, string]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                                <span className="capitalize">{key}</span>
                                <Badge variant="outline">{value.replace("_", " ")}</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="flex flex-col gap-3">
                    <h2 className="font-bold">erros 5xx recentes</h2>
                    {data.recent5xx.length === 0 ? (
                        <p className="text-sm text-muted-foreground">nenhum erro 5xx registrado</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>status</TableHead>
                                    <TableHead>método</TableHead>
                                    <TableHead>rota</TableHead>
                                    <TableHead>mensagem</TableHead>
                                    <TableHead className="text-right">quando</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recent5xx.map((error) => (
                                    <TableRow key={error.id}>
                                        <TableCell><Badge variant="destructive">{error.statusCode}</Badge></TableCell>
                                        <TableCell className="font-mono text-xs">{error.method ?? "-"}</TableCell>
                                        <TableCell className="max-w-48 truncate font-mono text-xs">{error.path ?? "-"}</TableCell>
                                        <TableCell className="max-w-64 truncate text-sm">{error.message ?? "-"}</TableCell>
                                        <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                                            {formatTime(new Date(error.createdAt)).ddMMyy}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div>
                <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/audit">ver auditoria completa <ArrowRightIcon className="size-3.5" /></Link>
                </Button>
            </div>
        </div>
    )
}
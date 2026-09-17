import { createFileRoute } from "@tanstack/react-router"
import { ShieldXIcon } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Metric } from "@/components/metric"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminFiscal } from "@/hooks/use-admin"

export const Route = createFileRoute("/admin/fiscal/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { data, isPending, isError, documents } = useAdminFiscal()

    if (isPending) return <Spinner />
    if (isError) return <p className="text-muted-foreground">não foi possível carregar as operações fiscais</p>

    if (!data.configured) {
        return (
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold uppercase">operações fiscais</h1>
                    <p className="text-muted-foreground">emissão e acompanhamento de documentos fiscais (NFC-e)</p>
                </div>
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                        <ShieldXIcon className="size-10 text-muted-foreground/50" />
                        <div>
                            <h2 className="font-bold">integração fiscal ainda não configurada</h2>
                            <p className="max-w-md text-sm text-muted-foreground">
                                defina FOCUS_NFE_TOKEN no backend para ativar a emissão de NFC-e em
                                homologação. sem o token, o backend responde configured false e
                                nenhum documento é emitido.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">operações fiscais</h1>
                <p className="text-muted-foreground">
                    documentos NFC-e emitidos pela plataforma
                    {data.environment ? ` · ambiente ${data.environment}` : ""}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric label="emitidos" value={String(data.documentsIssued)} detail="no total" />
                <Metric label="autorizados" value={String(data.authorized)} detail="com autorização" />
                <Metric label="rejeitados" value={String(data.rejected)} detail="com rejeição" />
                <Metric label="cancelados" value={String(data.cancelled)} detail="após autorização" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric label="contingência" value={String(data.contingency)} detail="operações offline" />
                <Metric label="taxa de falha" value={`${data.failureRate}%`} detail="sobre o total emitido" />
                <Metric label="códigos de rejeição" value={String(data.rejectionCodes.length)} detail="distintos" />
                <Metric label="erros recentes" value={String(data.recentErrors.length)} detail="a investigar" />
            </div>
            {data.rejectionCodes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>códigos de rejeição SEFAZ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>código</TableHead>
                                    <TableHead className="text-right">ocorrências</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.rejectionCodes.map((item) => (
                                    <TableRow key={item.code}>
                                        <TableCell className="font-mono">{item.code}</TableCell>
                                        <TableCell className="text-right">{item.total}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
            <Card>
                <CardHeader>
                    <CardTitle>documentos recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    {!documents || documents.documents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            nenhum documento emitido ainda. emita a primeira NFC-e a partir de uma
                            venda quitada.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ref</TableHead>
                                    <TableHead>loja</TableHead>
                                    <TableHead>status</TableHead>
                                    <TableHead>sefaz</TableHead>
                                    <TableHead className="text-right">chave</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-mono text-xs">{doc.ref}</TableCell>
                                        <TableCell>{doc.tenantName ?? "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={doc.status === "autorizado" ? "secondary" : "outline"}>
                                                {doc.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {doc.sefazCode ? `${doc.sefazCode} · ${doc.sefazMessage ?? ""}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {doc.chaveNfe ? `${doc.chaveNfe.slice(0, 12)}…` : "-"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

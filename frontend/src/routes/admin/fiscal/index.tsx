import { createFileRoute } from "@tanstack/react-router"
import { ShieldXIcon } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Metric } from "@/components/metric"
import { useAdminFiscal } from "@/hooks/use-admin"

export const Route = createFileRoute("/admin/fiscal/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { data, isPending, isError } = useAdminFiscal()

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
                                a emissão de NFC-e não está integrada ao backend nesta versão.
                                quando a integração for adicionada, este painel exibirá documentos emitidos,
                                autorizados, rejeitados, cancelados, operações em contingência, taxa de falha,
                                códigos de rejeição e erros recentes — permitindo depurar problemas fiscais
                                sem consultar logs de servidor.
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
                <p className="text-muted-foreground">documentos NFC-e emitidos pela plataforma</p>
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
        </div>
    )
}
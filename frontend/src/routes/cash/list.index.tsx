import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useCash } from "@/hooks/use-cash"
import type { CashListItem } from "@/lib/api-types"
import { formatCurrency } from "@/utils/finance"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/cash/list/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { cashes, cashesIsPending, cashesIsError } = useCash()
    const [selectedCash, setSelectedCash] = useState<CashListItem | null>(null)

    return (
        <div className="flex h-screen w-full gap-4 self-start p-4">
            <div className="flex w-full flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-bold uppercase">histórico de caixas</h1>
                    <p className="text-muted-foreground">aberturas, fechamentos e diferenças por caixa</p>
                </div>
                {cashesIsPending && <Spinner />}
                {cashesIsError && <span>ocorreu um erro ao buscar os caixas</span>}
                {cashes && cashes.length === 0 && (
                    <Card><CardContent className="text-center text-muted-foreground">nenhum caixa registrado</CardContent></Card>
                )}
                {cashes && cashes.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>status</TableHead>
                                <TableHead>abertura</TableHead>
                                <TableHead>fechamento</TableHead>
                                <TableHead>operador</TableHead>
                                <TableHead className="text-right">esperado</TableHead>
                                <TableHead className="text-right">contado</TableHead>
                                <TableHead className="text-right">diferença</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cashes.map((cash) => (
                                <TableRow key={cash.id} className="cursor-pointer" onClick={() => setSelectedCash(cash)}>
                                    <TableCell className="font-medium">{cash.id.split("-")[0]}</TableCell>
                                    <TableCell><Badge className={cash.status === "open" ? "bg-green-600" : "bg-red-600"}>{cash.status === "open" ? "aberto" : "fechado"}</Badge></TableCell>
                                    <TableCell>{formatTime(new Date(cash.openedAt)).ddMMyy}</TableCell>
                                    <TableCell>{cash.closedAt ? formatTime(new Date(cash.closedAt)).ddMMyy : "-"}</TableCell>
                                    <TableCell>{cash.users.createdBy?.login ?? "sistema"}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(cash.amounts.expectedClosing)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(cash.amounts.actualClosing ?? 0)}</TableCell>
                                    <TableCell className={cash.amounts.difference && cash.amounts.difference < 0 ? "text-right text-red-600" : "text-right text-green-600"}>{formatCurrency(cash.amounts.difference ?? 0)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
            <div className="w-[380px] shrink-0">
                <CashDetails cash={selectedCash} />
            </div>
        </div>
    )
}

function CashDetails({ cash }: { cash: CashListItem | null }) {
    if (!cash) {
        return <Card className="h-full"><CardContent className="flex h-full items-center justify-center text-center text-muted-foreground">selecione um caixa para ver detalhes</CardContent></Card>
    }

    return (
        <Card className="h-full">
            <CardContent className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl font-bold">caixa #{cash.id.split("-")[0]}</h2>
                    <p className="text-muted-foreground">{cash.status === "open" ? "aberto" : "fechado"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Metric label="abertura" value={formatCurrency(cash.amounts.opening)} />
                    <Metric label="entradas" value={formatCurrency(cash.amounts.inflow)} />
                    <Metric label="saídas" value={formatCurrency(cash.amounts.outflow)} />
                    <Metric label="esperado" value={formatCurrency(cash.amounts.expectedClosing)} />
                    <Metric label="contado" value={formatCurrency(cash.amounts.actualClosing ?? 0)} />
                    <Metric label="diferença" value={formatCurrency(cash.amounts.difference ?? 0)} />
                </div>
            </CardContent>
        </Card>
    )
}

function Metric({ label, value }: { label: string, value: string }) {
    return <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="font-bold">{value}</p></div>
}

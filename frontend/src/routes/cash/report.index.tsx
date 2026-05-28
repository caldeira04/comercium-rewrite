import { createFileRoute } from "@tanstack/react-router"
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
import { formatCurrency, translatePaymentMethod } from "@/utils/finance"

export const Route = createFileRoute("/cash/report/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { cashes, cashesIsPending, cashesIsError } = useCash()
    const totalInflow = cashes?.reduce((total, cash) => total + cash.amounts.inflow, 0) ?? 0
    const totalOutflow = cashes?.reduce((total, cash) => total + cash.amounts.outflow, 0) ?? 0
    const totalDifference = cashes?.reduce((total, cash) => total + (cash.amounts.difference ?? 0), 0) ?? 0
    const closedCashes = cashes?.filter((cash) => cash.status === "closed").length ?? 0
    const paymentRows = getPaymentRows(cashes ?? [])

    return (
        <div className="flex h-screen w-full flex-col gap-4 self-start p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">relatório de caixas</h1>
                <p className="text-muted-foreground">entradas, saídas, pagamentos e diferenças de fechamento</p>
            </div>
            {cashesIsPending && <Spinner />}
            {cashesIsError && <span>ocorreu um erro ao buscar os caixas</span>}
            {cashes && (
                <>
                    <div className="grid grid-cols-4 gap-4">
                        <Metric label="caixas" value={String(cashes.length)} />
                        <Metric label="fechados" value={String(closedCashes)} />
                        <Metric label="entradas" value={formatCurrency(totalInflow)} />
                        <Metric label="saídas" value={formatCurrency(totalOutflow)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Metric label="saldo líquido" value={formatCurrency(totalInflow - totalOutflow)} />
                        <Metric label="diferença acumulada" value={formatCurrency(totalDifference)} />
                    </div>
                    <Card>
                        <CardContent>
                            <h2 className="mb-4 font-bold">entradas por forma de pagamento</h2>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>forma</TableHead>
                                        <TableHead className="text-right">pagamentos</TableHead>
                                        <TableHead className="text-right">total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentRows.map((row) => (
                                        <TableRow key={row.method}>
                                            <TableCell>{translatePaymentMethod(row.method)}</TableCell>
                                            <TableCell className="text-right">{row.salesCount}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

function Metric({ label, value }: { label: string, value: string }) {
    return <Card><CardContent><p className="text-sm uppercase text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>
}

function getPaymentRows(cashes: NonNullable<ReturnType<typeof useCash>["cashes"]>) {
    const rows = new Map<"cash" | "pix" | "debit" | "credit" | "voucher", { method: "cash" | "pix" | "debit" | "credit" | "voucher", amount: number, salesCount: number }>()

    cashes.forEach((cash) => {
        cash.paymentSummary.forEach((payment) => {
            const method = payment.method as "cash" | "pix" | "debit" | "credit" | "voucher"
            const current = rows.get(method) ?? { method, amount: 0, salesCount: 0 }
            rows.set(method, {
                method,
                amount: current.amount + payment.amount,
                salesCount: current.salesCount + payment.salesCount,
            })
        })
    })

    return [...rows.values()].sort((a, b) => b.amount - a.amount)
}

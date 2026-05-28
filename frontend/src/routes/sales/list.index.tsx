import { Spinner } from "@/components/ui/spinner"
import { useSales } from "@/hooks/use-sales"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/utils/finance"
import type { SaleListItem, Sales } from "@/lib/api-types"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute('/sales/list/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { sales, salesIsPending, salesIsError } = useSales()
    const [selectedSale, setSelectedSale] = useState<SaleListItem | null>(null)

    return (
        <div className="flex h-screen w-full gap-4 self-start p-4">
            <div className="flex w-full flex-col gap-4">
                <div className="flex w-full items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold uppercase">histórico de vendas</h1>
                        <p className="text-muted-foreground">vendas registradas, itens e pagamentos</p>
                    </div>
                </div>
                {salesIsPending && (
                    <Spinner />
                )}
                {salesIsError && (
                    <span>ocorreu um erro ao buscar os dados</span>
                )}
                {sales && sales.length === 0 && (
                    <Card>
                        <CardContent className="text-center text-muted-foreground">nenhuma venda registrada</CardContent>
                    </Card>
                )}
                {sales && sales.length > 0 && (
                    <SalesTable sales={sales} onSelect={(sale) => setSelectedSale(sale)} />
                )}
            </div>
            <div className="w-[420px] shrink-0">
                <SaleDetails sale={selectedSale} />
            </div>
        </div>
    )
}

interface SalesTableProps {
    sales: NonNullable<Sales>
    onSelect: (sale: SaleListItem) => void
}

function SalesTable({ sales, onSelect }: SalesTableProps) {

    return (
        <Table className='min-h-full'>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>data</TableHead>
                        <TableHead>cliente</TableHead>
                        <TableHead>itens</TableHead>
                        <TableHead>pago</TableHead>
                    <TableHead className="text-right">total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sales.map((s) => (
                        <TableRow key={s.id} onClick={() => onSelect(s)} className='cursor-pointer'>
                        <TableCell className="font-medium">{s.id.split("-")[0]}</TableCell>
                        <TableCell>{formatTime(new Date(s.createdAt)).ddMMyy}</TableCell>
                        <TableCell>{s.client?.name ?? "-"}</TableCell>
                        <TableCell>{s.saleItem.length}</TableCell>
                        <TableCell>{formatCurrency(s.payment.reduce((total, payment) => total + payment.amount, 0))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(s.totalAmount)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function SaleDetails({ sale }: { sale?: SaleListItem | null }) {

    return (
        <Card className="h-full w-full">
            <CardContent className="flex flex-col gap-4">
                {!sale && (
                    <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                        selecione uma venda para ver os detalhes
                    </div>
                )}
                {sale && <ReadableSaleDetails sale={sale} />}
            </CardContent>
        </Card>
    )
}

function ReadableSaleDetails({ sale }: { sale: SaleListItem }) {
    const paidAmount = sale.payment.reduce((total, payment) => total + payment.amount, 0)
    const pendingAmount = sale.totalAmount - paidAmount

    return (
        <>
            <div>
                <h2 className="text-xl font-bold">venda #{sale.id.split("-")[0]}</h2>
                <p className="text-muted-foreground">{formatTime(new Date(sale.createdAt)).ddMMyy}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Metric label="cliente" value={sale.client?.name ?? "não informado"} />
                <Metric label="itens" value={String(sale.saleItem.length)} />
                <Metric label="total" value={formatCurrency(sale.totalAmount)} />
                <Metric label="pago" value={formatCurrency(paidAmount)} />
                <Metric label="pendente" value={formatCurrency(pendingAmount)} />
                <Metric label="status" value={pendingAmount <= 0 ? "quitada" : "pendente"} />
            </div>
            <div>
                <h3 className="mb-2 font-bold">produtos</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>produto</TableHead>
                            <TableHead className="text-right">qtd.</TableHead>
                            <TableHead className="text-right">total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sale.saleItem.map((item, index) => (
                            <TableRow key={`${item.product.id}-${index}`}>
                                <TableCell>{item.product.name}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}

function Metric({ label, value }: { label: string, value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">{label}</p>
            <p className="font-bold">{value}</p>
        </div>
    )
}

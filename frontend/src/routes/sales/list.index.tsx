import { Spinner } from "@/components/ui/spinner"
import { useSales, useSalesList } from "@/hooks/use-sales"
import { useClients } from "@/hooks/use-clients"
import { useReportFilters } from "@/hooks/use-report-filters"
import { useFormatDateTime, useTenantDates } from "@/hooks/use-tenant-timezone"
import { FilterSelect, PAYMENT_METHOD_OPTIONS, ReportFilters, clientOptions } from "@/components/report-filters"
import { usePayments } from "@/hooks/use-payments"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/utils/finance"
import { formatPaymentMethod } from "@/utils/formatters"
import { getApiErrorMessage } from "@/lib/api-error"
import { toast } from "sonner"
import type { SaleListItem, Sales } from "@/lib/api-types"

export const Route = createFileRoute('/sales/list/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { monthStart, monthEnd } = useTenantDates()
    const { filters, invalidRange, setFilter, setFilters, reset } = useReportFilters({
        startDate: monthStart,
        endDate: monthEnd,
        clientId: "all",
        paymentMethod: "all",
    })
    const { clients } = useClients()
    const salesQuery = useSalesList(filters, { enabled: !invalidRange })
    const sales = invalidRange ? undefined : salesQuery.data
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
    const selectedSale = sales?.find((sale) => sale.id === selectedSaleId) ?? null

    return (
        <div className="flex h-screen w-full gap-4 self-start p-4">
            <div className="flex w-full min-w-0 flex-col gap-4">
                <div className="flex w-full items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold uppercase">histórico de vendas</h1>
                        <p className="text-muted-foreground">vendas registradas, itens e pagamentos</p>
                    </div>
                </div>
                <ReportFilters
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onPeriodChange={setFilters}
                    invalidRange={invalidRange}
                    onReset={reset}
                >
                    <FilterSelect
                        label="cliente"
                        className="w-56"
                        value={filters.clientId}
                        onChange={(value) => setFilter("clientId", value)}
                        options={clientOptions(clients)}
                    />
                    <FilterSelect
                        label="forma de pagamento"
                        value={filters.paymentMethod}
                        onChange={(value) => setFilter("paymentMethod", value)}
                        options={PAYMENT_METHOD_OPTIONS}
                    />
                </ReportFilters>
                {!invalidRange && salesQuery.isPending && (
                    <Spinner />
                )}
                {!invalidRange && salesQuery.isError && (
                    <span>ocorreu um erro ao buscar os dados</span>
                )}
                {sales && sales.length === 0 && (
                    <Card>
                        <CardContent className="text-center text-muted-foreground">
                            nenhuma venda encontrada para os filtros selecionados
                        </CardContent>
                    </Card>
                )}
                {sales && sales.length > 0 && (
                    <div className="min-h-0 flex-1 overflow-auto">
                        <SalesTable sales={sales} onSelect={(sale) => setSelectedSaleId(sale.id)} />
                    </div>
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
    const formatDateTime = useFormatDateTime()

    return (
        <Table>
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
                        <TableCell>{formatDateTime(s.createdAt).date}</TableCell>
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
    const formatDateTime = useFormatDateTime()
    const { cancelSale, cancelSaleIsPending } = useSales({ loadSales: false })
    const { refundPayment, refundPaymentIsPending } = usePayments()
    const paidAmount = sale.payment.reduce((total, payment) => total + payment.amount, 0)
    const pendingAmount = sale.totalAmount - paidAmount

    async function handleRefund(paymentId: string) {
        const confirmed = window.confirm("estornar este pagamento?")
        if (!confirmed) return

        try {
            await refundPayment(paymentId)
            toast.success("pagamento estornado com sucesso")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao estornar pagamento"))
        }
    }

    async function handleCancel() {
        const confirmed = window.confirm("cancelar esta venda?")
        if (!confirmed) return

        try {
            await cancelSale(sale.id)
            toast.success("venda cancelada com sucesso")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao cancelar venda"))
        }
    }

    return (
        <>
            <div>
                <h2 className="text-xl font-bold">venda #{sale.id.split("-")[0]}</h2>
                <p className="text-muted-foreground">{formatDateTime(sale.createdAt).date} às {formatDateTime(sale.createdAt).time}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Metric label="cliente" value={sale.client?.name ?? "não informado"} />
                <Metric label="itens" value={String(sale.saleItem.length)} />
                <Metric label="total" value={formatCurrency(sale.totalAmount)} />
                <Metric label="pago" value={formatCurrency(paidAmount)} />
                <Metric label="pendente" value={formatCurrency(pendingAmount)} />
                <Metric label="status" value={sale.settledAt ? "quitada" : pendingAmount <= 0 ? "quitada" : "pendente"} />
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
            {sale.payment.length > 0 && (
                <div>
                    <h3 className="mb-2 font-bold">pagamentos</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>forma</TableHead>
                                <TableHead className="text-right">valor</TableHead>
                                <TableHead>status</TableHead>
                                <TableHead className="text-right">ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.payment.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="capitalize">{formatPaymentMethod({ method: payment.paymentMethod })}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                    <TableCell>
                                        <Badge variant={payment.status === "paid" ? "secondary" : "outline"}>{payment.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {payment.status === "paid" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={refundPaymentIsPending}
                                                onClick={() => handleRefund(payment.id)}
                                            >estornar</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {!sale.settledAt && (
                <Button
                    variant="destructive"
                    disabled={cancelSaleIsPending}
                    onClick={handleCancel}
                >cancelar venda</Button>
            )}
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

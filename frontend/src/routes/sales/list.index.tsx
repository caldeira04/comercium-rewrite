import { Spinner } from "@/components/ui/spinner"
import { useSales } from "@/hooks/use-sales"
import { usePayments } from "@/hooks/use-payments"
import { useSaleNfce } from "@/hooks/use-fiscal"
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
    const { cancelSale, cancelSaleIsPending } = useSales()
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
                <p className="text-muted-foreground">{formatTime(new Date(sale.createdAt)).ddMMyy}</p>
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
            <NfcePanel saleId={sale.id} settledAt={sale.settledAt} />
        </>
    )
}

function NfcePanel({ saleId, settledAt }: { saleId: string, settledAt?: string | null }) {
    const { nfce, nfceIsPending, emitNfce, emitNfceIsPending, refreshNfce, refreshNfceIsPending, cancelNfce, cancelNfceIsPending } = useSaleNfce(saleId)

    async function handleEmit() {
        try {
            await emitNfce(saleId)
            toast.success("NFC-e enviada para a Focus em homologação")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao emitir NFC-e"))
        }
    }

    async function handleRefresh() {
        try {
            await refreshNfce(saleId)
            toast.success("status da NFC-e atualizado")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao consultar NFC-e"))
        }
    }

    async function handleCancel() {
        const justificativa = window.prompt("justificativa do cancelamento (15 a 255 caracteres)")
        if (!justificativa) return
        try {
            await cancelNfce({ targetSaleId: saleId, justificativa })
            toast.success("NFC-e cancelada")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao cancelar NFC-e"))
        }
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
                <h3 className="font-bold">NFC-e</h3>
                {nfce && <Badge variant={nfce.status === "autorizado" ? "secondary" : "outline"}>{nfce.status}</Badge>}
            </div>
            {!settledAt && (
                <p className="text-sm text-muted-foreground">finalize a venda para emitir a NFC-e.</p>
            )}
            {nfceIsPending && <span className="text-sm text-muted-foreground">carregando documento…</span>}
            {!nfceIsPending && !nfce && (
                <p className="text-sm text-muted-foreground">nenhuma NFC-e emitida para esta venda.</p>
            )}
            {nfce && (
                <div className="flex flex-col gap-1 text-sm">
                    <span className="font-mono text-xs">ref {nfce.ref}</span>
                    {nfce.sefazCode && <span>sefaz {nfce.sefazCode} · {nfce.sefazMessage ?? ""}</span>}
                    {nfce.chaveNfe && <span className="font-mono text-xs">chave {nfce.chaveNfe}</span>}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={!settledAt || emitNfceIsPending} onClick={handleEmit}>
                    emitir NFC-e
                </Button>
                {nfce && (
                    <Button size="sm" variant="outline" disabled={refreshNfceIsPending} onClick={handleRefresh}>
                        consultar status
                    </Button>
                )}
                {nfce?.status === "autorizado" && (
                    <Button size="sm" variant="outline" disabled={cancelNfceIsPending} onClick={handleCancel}>
                        cancelar
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">emissão em homologação, sem validade fiscal.</p>
        </div>
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

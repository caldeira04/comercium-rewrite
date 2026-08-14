import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCashMovementType } from '@/utils/formatters'
import { formatCurrency } from '@/utils/finance'
import { formatTime } from "@/utils/time"
import { cn } from '@/lib/utils'
import type { CurrentCash } from '@/lib/api-types'
import { ArrowDown, ArrowUp, Banknote, ClockIcon, CreditCard, EllipsisIcon, Wallet, WalletCards } from 'lucide-react'
import { SiPix } from "@icons-pack/react-simple-icons"

export function CashOverview({ cash }: { cash: NonNullable<CurrentCash> }) {
    const isOpen = cash.status === "open"
    const paymentSummary = new Map(cash.paymentSummary.map((item) => [item.method, item]))

    return (
        <div className="w-full flex flex-col gap-4">
            <div className='flex flex-col gap-4'>
                <div className='flex gap-2 justify-between'>
                    <Card className='flex-1'>
                        <CardContent className='flex items-center gap-4'>
                            <div className='bg-green-600/10 w-12 h-12 rounded-full flex items-center justify-center text-green-800'><ArrowDown /> </div>
                            <div className='flex flex-col gap-2 items-start'>
                                <h3 className='font-bold'>entradas</h3>
                                <span className='font-bold text-lg text-green-600 text-nowrap'>{formatCurrency(cash.amounts.inflow)}</span>
                                <span className='text-muted-foreground text-xs'>{cash.movementSummary.inCount} movimentações</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className='flex-1'>
                        <CardContent className='flex items-center gap-4'>
                            <div className='bg-red-600/10 w-12 h-12 rounded-full flex items-center justify-center text-red-800'><ArrowUp /> </div>
                            <div className='flex flex-col gap-2 items-start'>
                                <h3 className='font-bold'>saídas</h3>
                                <span className='font-bold text-lg text-red-600 text-nowrap'>{formatCurrency(cash.amounts.outflow)}</span>
                                <span className='text-muted-foreground text-xs'>{cash.movementSummary.outCount} movimentações</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className='flex items-center gap-4'>
                            <div className='bg-black/10 w-12 h-12 rounded-full flex items-center justify-center'><Wallet /> </div>
                            <div className='flex flex-col gap-2 items-start'>
                                <h3 className='font-bold'>{isOpen ? "saldo do dia" : "saldo esperado"}</h3>
                                <span className='font-bold text-lg'>{formatCurrency(cash.amounts.expectedClosing)}</span>
                                <span className='text-muted-foreground text-xs'>abertura + entradas - saídas</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className='flex items-center gap-4'>
                            <div className='bg-black/10 w-12 h-12 rounded-full flex items-center justify-center'><Banknote /> </div>
                            <div className='flex flex-col gap-2 items-start'>
                                <h3 className='font-bold'>{isOpen ? "dinheiro em caixa" : "saldo contado"}</h3>
                                <span className='font-bold text-lg'>{formatCurrency(cash.amounts.actualClosing ?? 0)}</span>
                                <span className='text-muted-foreground text-xs'>informado no fechamento</span>
                            </div>
                        </CardContent>
                    </Card>
                    {!isOpen && (
                        <Card className={cash.amounts.difference && cash.amounts.difference >= 0 ? "bg-green-600/10" : "bg-red-600/10"}>
                            <CardContent className='flex items-center gap-4'>
                                <div className='flex flex-col gap-2 items-start'>
                                    <h3 className='font-bold'>diferença</h3>
                                    <span className={`${cash.amounts.difference && cash.amounts.difference >= 0 ? "text-green-600" : "text-red-600"} font-bold text-lg`}>{formatCurrency(cash.amounts.difference ?? 0)}</span>
                                    <span className='text-muted-foreground text-xs'>total - contado</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
                <Card className='flex flex-col px-4'>
                    <h2 className='font-bold'>entradas por forma de pagamento</h2>
                    <div className='flex items-center gap-2 justify-between'>
                        <Card className='flex-1'>
                            <CardContent className='flex flex-col items-start gap-4'>
                                <div className='flex gap-2 items-center justify-start'>
                                    <div className='bg-green-600/10 w-10 h-10 rounded-full flex text-green-600 items-center justify-center'><Banknote /> </div>
                                    <h3>dinheiro</h3>
                                </div>
                                <div className='flex flex-col gap-2 items-start'>
                                    <span className='font-bold text-lg'>{formatCurrency(paymentSummary.get("cash")?.amount ?? 0)}</span>
                                    <span className='text-muted-foreground text-xs'>{paymentSummary.get("cash")?.salesCount ?? 0} pagamentos</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className='flex-1'>
                            <CardContent className='flex flex-col items-start gap-4'>
                                <div className='flex gap-2 items-center justify-start'>
                                    <div className='bg-[#77b6a8]/10 text-[#77B6A8] w-10 h-10 rounded-full flex items-center justify-center'><SiPix /></div>
                                    <h3>pix</h3>
                                </div>
                                <div className='flex flex-col gap-2 items-start'>
                                    <span className='font-bold text-lg'>{formatCurrency(paymentSummary.get("pix")?.amount ?? 0)}</span>
                                    <span className='text-muted-foreground text-xs'>{paymentSummary.get("pix")?.salesCount ?? 0} pagamentos</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className='flex-1'>
                            <CardContent className='flex flex-col items-start gap-4'>
                                <div className='flex gap-2 items-center justify-start'>
                                    <div className='bg-blue-600/10 w-10 h-10 rounded-full flex text-blue-600 items-center justify-center'><CreditCard /> </div>
                                    <h3>débito</h3>
                                </div>
                                <div className='flex flex-col gap-2 items-start'>
                                    <span className='font-bold text-lg'>{formatCurrency(paymentSummary.get("debit")?.amount ?? 0)}</span>
                                    <span className='text-muted-foreground text-xs'>{paymentSummary.get("debit")?.salesCount ?? 0} pagamentos</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className='flex-1'>
                            <CardContent className='flex flex-col items-start gap-4'>
                                <div className='flex gap-2 items-center justify-start'>
                                    <div className='bg-red-600/10 w-10 h-10 rounded-full flex text-red-600 items-center justify-center'><CreditCard /> </div>
                                    <h3>crédito</h3>
                                </div>
                                <div className='flex flex-col gap-2 items-start'>
                                    <span className='font-bold text-lg'>{formatCurrency(paymentSummary.get("credit")?.amount ?? 0)}</span>
                                    <span className='text-muted-foreground text-xs'>{paymentSummary.get("credit")?.salesCount ?? 0} pagamentos</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className='flex-1'>
                            <CardContent className='flex flex-col items-start gap-4'>
                                <div className='flex gap-2 items-center justify-start'>
                                    <div className='bg-purple-600/10 w-10 h-10 rounded-full flex text-purple-600 items-center justify-center'><WalletCards /></div>
                                    <h3>cheque</h3>
                                </div>
                                <div className='flex flex-col gap-2 items-start'>
                                    <span className='font-bold text-lg'>{formatCurrency(paymentSummary.get("voucher")?.amount ?? 0)}</span>
                                    <span className='text-muted-foreground text-xs'>{paymentSummary.get("voucher")?.salesCount ?? 0} pagamentos</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </Card>
            </div>
            <Card>
                <CardContent className='flex flex-col gap-4'>
                    <h2 className='font-bold'>movimentações do caixa</h2>
                    <CashMovementsTable cash={cash} />
                </CardContent>
            </Card>
        </div>
    )
}

function CashMovementsTable({ cash }: {
    cash: NonNullable<CurrentCash>
}) {
    return (
        <div className="rounded-xl border bg-card text-card-foreground">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[90px]">
                            <div className="flex items-center gap-2">
                                <ClockIcon size={14} />
                                Hora
                            </div>
                        </TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[140px]">Método</TableHead>
                        <TableHead className="w-[140px]">Operador</TableHead>
                        <TableHead className="text-right w-[140px]">Valor</TableHead>
                        <TableHead className="text-right w-[80px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cash.movements.length > 0 ? (
                        cash.movements.map((item) => (
                            <TableRow
                                key={item.id}
                                className="transition-colors hover:bg-muted/50"
                            >
                                <TableCell className="font-medium text-muted-foreground">
                                    {formatTime(new Date(item.createdAt)).hhMM}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {formatCashMovementType({ type: item.type })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {item.description ?? "Sem descrição"}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.reference?.type === "payment" ? (
                                        <Badge variant="outline" className="capitalize">pagamento</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="capitalize">manual</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {item.createdByUser ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                                {item.createdByUser.login}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">sistema</span>
                                    )}
                                </TableCell>
                                <TableCell
                                    className={cn(
                                        "text-right font-semibold",
                                        item.nature === "in" ? "text-emerald-600" : "text-red-500"
                                    )}
                                >
                                    {item.nature === "in" ? "+" : "-"}
                                    {formatCurrency(Math.abs(item.amount))}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end">
                                        <Button size="icon" variant="ghost">
                                            <EllipsisIcon size={16} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                Nenhuma movimentação encontrada
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
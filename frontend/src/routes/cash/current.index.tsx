import { Spinner } from '@/components/ui/spinner'
import { formatTime } from "@/utils/time"
import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useCash } from '@/hooks/use-cash'
import { createFileRoute } from '@tanstack/react-router'
import { formatCurrency } from '@/utils/finance'
import { ArrowDown, ArrowUp, Banknote, ClockIcon, CreditCard, EllipsisIcon, Wallet, WalletCards } from 'lucide-react'
import NewCashDialog from '@/components/new-cash-dialog'
import { formatCashMovementType } from '@/utils/formatters'
import type { CurrentCash } from '@/lib/api-types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SiPix } from "@icons-pack/react-simple-icons"
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import NewCashMovementDialog from '@/components/new-cash-movement-dialog'
import CloseCashDialog from '@/components/close-cash-dialog'

export const Route = createFileRoute('/cash/current/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { currentCash, currentCashIsPending } = useCash()

    const isOpen = currentCash?.status === "open"
    const paymentSummary = new Map(currentCash ? currentCash.paymentSummary.map((item) => [item.method, item]) : [])

    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            <div className='w-full flex flex-col gap-4'>
                <div className='px-4'>
                    <div className='flex items-center'>
                        {!currentCashIsPending && (
                            <Badge className={currentCash?.closedAt ? "text-red-600 bg-red-600" : "text-green-600 bg-green-600"} />
                        )}
                        <h1 className='p-4 font-bold text-2xl uppercase'>caixa {currentCashIsPending ? <Skeleton /> : currentCash?.closedAt ? "fechado" : currentCash?.openedAt ? "aberto" : ""}</h1>
                        {!currentCashIsPending && currentCash && (
                            <Badge variant={"secondary"}>ID: #{currentCash.id.split("-")[0]}</Badge>
                        )}
                    </div>
                    <div>
                        {!currentCashIsPending && currentCash && (
                            <div className='text-green-600 flex gap-2 items-center'>
                                <span>aberto em <span className='font-bold'>{formatTime(new Date(currentCash.openedAt)).ddMMyy} - {formatTime(new Date(currentCash.openedAt)).hhMM}</span></span>
                                <span>por <span className='font-bold'>{currentCash.users.createdBy?.login}</span></span>
                            </div>
                        )}
                        {!currentCashIsPending && currentCash && currentCash.closedAt && (
                            <div className='text-red-600 flex gap-2 items-center'>
                                <span>fechado em <span className='font-bold'>{formatTime(new Date(currentCash.closedAt)).ddMMyy} - {formatTime(new Date(currentCash.closedAt)).hhMM}</span></span>
                                <span>por <span className='font-bold'>{currentCash.users.closedBy?.login}</span></span>
                            </div>
                        )}
                    </div>
                </div>
                {/* detalhes e tabela de itens */}
                {!currentCashIsPending && !currentCash && (
                    <Card>
                        <CardContent className="flex items-center justify-between">
                            <div>
                                <h2 className="font-bold">nenhum caixa encontrado</h2>
                                <p className="text-muted-foreground">abra um caixa para iniciar as vendas do dia</p>
                            </div>
                            <NewCashDialog />
                        </CardContent>
                    </Card>
                )}
                {!currentCashIsPending && currentCash && (
                    <div className='w-full flex flex-col gap-4'>
                        <div className='flex flex-col gap-4'>
                            <div className='flex gap-2 justify-between'>
                                <Card className='flex-1'>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-green-600/10 w-12 h-12 rounded-full flex items-center justify-center text-green-800'><ArrowDown /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>entradas</h3>
                                            <span className='font-bold text-lg text-green-600 text-nowrap'>{formatCurrency(currentCash.amounts.inflow)}</span>
                                            <span className='text-muted-foreground text-xs'>{currentCash.movementSummary.inCount} movimentações</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className='flex-1'>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-red-600/10 w-12 h-12 rounded-full flex items-center justify-center text-red-800'><ArrowUp /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>saídas</h3>
                                            <span className='font-bold text-lg text-red-600 text-nowrap'>{formatCurrency(currentCash.amounts.outflow)}</span>
                                            <span className='text-muted-foreground text-xs'>{currentCash.movementSummary.outCount} movimentações</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-black/10 w-12 h-12 rounded-full flex items-center justify-center'><Wallet /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>{isOpen ? "saldo do dia" : "saldo esperado"}</h3>
                                            <span className='font-bold text-lg'>{formatCurrency(currentCash.amounts.expectedClosing)}</span>
                                            <span className='text-muted-foreground text-xs'>abertura + entradas - saídas</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-black/10 w-12 h-12 rounded-full flex items-center justify-center'><Banknote /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>{isOpen ? "dinheiro em caixa" : "saldo contado"}</h3>
                                            <span className='font-bold text-lg'>{formatCurrency(currentCash.amounts.actualClosing ?? 0)}</span>
                                            <span className='text-muted-foreground text-xs'>informado no fechamento</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                {!isOpen && (
                                    <Card className={currentCash.amounts.difference && currentCash.amounts.difference >= 0 ? "bg-green-600/10" : "bg-red-600/10"}>
                                        <CardContent className='flex items-center gap-4'>
                                            <div className='flex flex-col gap-2 items-start'>
                                                <h3 className='font-bold'>diferença</h3>
                                                <span className={`${currentCash.amounts.difference && currentCash.amounts.difference >= 0 ? "text-green-600" : "text-red-600"} font-bold text-lg`}>{formatCurrency(currentCash.amounts.difference ?? 0)}</span>
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
                                <CashTable cash={currentCash} />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            {/* barra lateral direita */}
            <div className='w-1/4 max-w-1/4'>
                {currentCashIsPending && (
                    <Spinner />
                )}
                {currentCash && (
                    <CashDetails cash={currentCash} isOpen={isOpen} />
                )}
            </div>
        </div>
    )
}

function CashTable({ cash }: {
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

                        <TableHead className="w-[140px]">
                            Método
                        </TableHead>

                        <TableHead className="w-[140px]">
                            Operador
                        </TableHead>

                        <TableHead className="text-right w-[140px]">
                            Valor
                        </TableHead>

                        <TableHead className="text-right w-[80px]">
                            Ações
                        </TableHead>
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
                                            {formatCashMovementType({
                                                type: item.type,
                                            })}
                                        </span>

                                        <span className="text-xs text-muted-foreground">
                                            {item.description ??
                                                "Sem descrição"}
                                        </span>
                                    </div>
                                </TableCell>

                                <TableCell>
                                    {item.reference?.type === "payment" ? (
                                        <Badge
                                            variant="outline"
                                            className="capitalize"
                                        >
                                            pagamento
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="secondary"
                                            className="capitalize"
                                        >
                                            manual
                                        </Badge>
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
                                        <span className="text-muted-foreground">
                                            sistema
                                        </span>
                                    )}
                                </TableCell>

                                <TableCell
                                    className={cn(
                                        "text-right font-semibold",
                                        item.nature === "in"
                                            ? "text-emerald-600"
                                            : "text-red-500"
                                    )}
                                >
                                    {item.nature === "in"
                                        ? "+"
                                        : "-"}

                                    {formatCurrency(
                                        Math.abs(item.amount)
                                    )}
                                </TableCell>

                                <TableCell>
                                    <div className="flex justify-end">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                        >
                                            <EllipsisIcon size={16} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={6}
                                className="h-32 text-center text-muted-foreground"
                            >
                                Nenhuma movimentação encontrada
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
function CashDetails({ cash, isOpen }: {
    cash: CurrentCash
    isOpen: boolean
}) {
    return (
        <div className='p-4 border-muted border rounded-xl w-full flex items-center justify-start h-screen'>
            <div className='w-full flex flex-col h-full gap-4 justify-start'>
                <h2 className='font-bold text-lg'>detalhes do {isOpen ? "caixa" : "fechamento"}</h2>
                <div className='text-sm flex flex-col gap-2'>
                    <div className='flex items-center justify-between'><span>status</span><Badge className={isOpen ? "bg-green-500" : "bg-red-500"}>{isOpen ? "aberto" : "fechado"}</Badge></div>
                    <div className='flex items-center justify-between'><span>abertura</span>
                        {cash?.openedAt ? (
                            <span>{formatTime(new Date(cash.openedAt)).ddMMyy} às {formatTime(new Date(cash.openedAt)).hhMM}</span>
                        ) : (
                            <span>-</span>
                        )}
                    </div>
                    <div className='flex items-center justify-between'><span>{isOpen ? "operador" : "fechador"}</span>
                        {isOpen ? (
                            <span>{cash?.users?.createdBy?.login ? cash.users.createdBy.login : ""}</span>
                        ) : (
                            <span>{cash?.users?.closedBy?.login ? cash.users.closedBy.login : ""}</span>
                        )}
                    </div>
                </div>
                <h2 className='font-bold text-lg'>ações rápidas</h2>
                <div className='text-sm flex flex-col gap-2'>
                    {cash?.id && isOpen && (
                        <div className="flex flex-col gap-2">
                            <NewCashMovementDialog
                                cashId={cash.id}
                                type='topup'
                            />
                            <NewCashMovementDialog
                                cashId={cash.id}
                                type='drop'
                            />
                            <CloseCashDialog cashId={cash.id} />
                        </div>
                    )}
                    {!isOpen && <NewCashDialog />}
                </div>
            </div>
        </div >
    )
}

import { Spinner } from '@/components/ui/spinner'
import { formatTime } from "@/utils/time"
import { Card, CardContent, CardFooter } from '@/components/ui/card'
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
import { ArrowDown, ArrowUp, Banknote, ClockIcon, CreditCard, Wallet, WalletCards } from 'lucide-react'
import NewCashDialog from '@/components/new-cash-dialog'
import { formatCashMovementNature, formatCashMovementType } from '@/utils/formatters'
import type { CurrentCash } from '@/lib/api-types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SiPix } from "@icons-pack/react-simple-icons"

export const Route = createFileRoute('/cash/current/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { currentCash, currentCashIsPending } = useCash()

    const positiveEntries = currentCash ? currentCash?.cashMovements
        .filter((item) => item.nature === "in") : []

    const positiveAmount = positiveEntries
        .reduce((acc, item) => acc + item.amount, 0) ?? 0

    const negativeEntries = currentCash ? currentCash?.cashMovements
        .filter((item) => item.nature === "out") : []

    const negativeAmount = negativeEntries
        .reduce((acc, item) => acc + item.amount, 0) ?? 0

    const totalAmount = positiveAmount - negativeAmount

    const isOpen = currentCash && currentCash.closedAt === null

    const diff = (currentCash ? currentCash.actualClosingAmount ?? 0 : 0) - (currentCash ? currentCash.expectedClosingAmount ?? 0 : 0)

    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            <div className='w-full flex flex-col gap-4'>
                <div className='px-4'>
                    <div className='flex items-center'>
                        {!currentCashIsPending && (
                            <Badge className={currentCash?.closedAt ? "text-red-600 bg-red-600" : "text-green-600 bg-green-600"} />
                        )}
                        <h1 className='p-4 font-bold text-2xl uppercase'>caixa {currentCashIsPending ? <Skeleton /> : currentCash?.closedAt ? "fechado" : "aberto"}</h1>
                        {!currentCashIsPending && (
                            <Badge variant={"secondary"}>ID: #{currentCash ? currentCash.id.split("-")[0] : <Skeleton />}</Badge>
                        )}
                    </div>
                    <div>
                        {!currentCashIsPending && currentCash && (
                            <div className='text-green-600 flex gap-2 items-center'>
                                <span>aberto em <span className='font-bold'>{formatTime(new Date(currentCash.createdAt)).ddMMyy} - {formatTime(new Date(currentCash.createdAt)).hhMM}</span></span>
                                <span>por <span className='font-bold'>{currentCash.createdByUser?.login}</span></span>
                            </div>
                        )}
                        {!currentCashIsPending && currentCash && currentCash.closedAt && (
                            <div className='text-red-600 flex gap-2 items-center'>
                                <span>fechado em <span className='font-bold'>{formatTime(new Date(currentCash.closedAt)).ddMMyy} - {formatTime(new Date(currentCash.closedAt)).hhMM}</span></span>
                                <span>por <span className='font-bold'>{currentCash.closedByUser?.login}</span></span>
                            </div>
                        )}
                    </div>
                </div>
                {/* detalhes e tabela de itens */}
                {!currentCashIsPending && currentCash && (
                    <div className='w-full flex flex-col gap-4'>
                        <div className='flex flex-col gap-4'>
                            <div className='flex gap-2 justify-between'>
                                <Card className='flex-1'>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-green-600/10 w-12 h-12 rounded-full flex items-center justify-center text-green-800'><ArrowDown /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>entradas</h3>
                                            <span className='font-bold text-lg text-green-600 text-nowrap'>{formatCurrency(positiveAmount)}</span>
                                            <span className='text-muted-foreground text-xs'>{positiveEntries.length} movimentações</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className='flex-1'>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-red-600/10 w-12 h-12 rounded-full flex items-center justify-center text-red-800'><ArrowUp /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>saídas</h3>
                                            <span className='font-bold text-lg text-red-600 text-nowrap'>{formatCurrency(negativeAmount)}</span>
                                            <span className='text-muted-foreground text-xs'>{negativeEntries.length} movimentações</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-black/10 w-12 h-12 rounded-full flex items-center justify-center'><Wallet /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>{isOpen ? "saldo do dia" : "saldo esperado"}</h3>
                                            <span className='font-bold text-lg'>{formatCurrency(totalAmount)}</span>
                                            <span className='text-muted-foreground text-xs'>abertura + entradas - saídas</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className='flex items-center gap-4'>
                                        <div className='bg-black/10 w-12 h-12 rounded-full flex items-center justify-center'><Banknote /> </div>
                                        <div className='flex flex-col gap-2 items-start'>
                                            <h3 className='font-bold'>{isOpen ? "dinheiro em caixa" : "saldo contado"}</h3>
                                            <span className='font-bold text-lg'>{formatCurrency(currentCash.actualClosingAmount ?? 0)}</span>
                                            <span className='text-muted-foreground text-xs'>informado no fechamento</span>
                                        </div>
                                    </CardContent>
                                </Card>
                                {!isOpen && (
                                    <Card className={diff >= 0 ? "bg-green-600/10" : "bg-red-600/10"}>
                                        <CardContent className='flex items-center gap-4'>
                                            <div className='flex flex-col gap-2 items-start'>
                                                <h3 className='font-bold'>diferença</h3>
                                                <span className={`${diff >= 0 ? "text-green-600" : "text-red-600"} font-bold text-lg`}>{formatCurrency(diff)}</span>
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
                                                <span className='font-bold text-lg'>{formatCurrency(currentCash.paymentSummary[0].amount ?? 0)}</span>
                                                <span className='text-muted-foreground text-xs'>{currentCash.paymentSummary[0].salesCount ?? 0} pagamentos</span>
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
                                                <span className='font-bold text-lg'>{formatCurrency(currentCash.paymentSummary[1].amount ?? 0)}</span>
                                                <span className='text-muted-foreground text-xs'>{currentCash.paymentSummary[1].salesCount ?? 0} pagamentos</span>
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
                                                <span className='font-bold text-lg'>{formatCurrency(currentCash.paymentSummary[2].amount ?? 0)}</span>
                                                <span className='text-muted-foreground text-xs'>{currentCash.paymentSummary[2].salesCount ?? 0} pagamentos</span>
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
                                                <span className='font-bold text-lg'>{formatCurrency(currentCash.paymentSummary[3].amount ?? 0)}</span>
                                                <span className='text-muted-foreground text-xs'>{currentCash.paymentSummary[3].salesCount ?? 0} pagamentos</span>
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
                                                <span className='font-bold text-lg'>{formatCurrency(currentCash.paymentSummary[4].amount ?? 0)}</span>
                                                <span className='text-muted-foreground text-xs'>{currentCash.paymentSummary[4].salesCount ?? 0} pagamentos</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </Card>
                        </div>
                        <Card>
                            <CardContent>
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
                <CashDetails
                    cash={currentCash}
                    positiveAmount={positiveAmount}
                    negativeAmount={negativeAmount}
                    totalAmount={totalAmount}
                />
            </div>
        </div>
    )
}

function CashTable({ cash }: {
    cash: NonNullable<CurrentCash>
}) {
    return (
        <Table className='min-h-full'>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]"><ClockIcon /></TableHead>
                    <TableHead>natureza</TableHead>
                    <TableHead>valor</TableHead>
                    <TableHead>tipo</TableHead>
                    <TableHead className="text-right">ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {cash.cashMovements && cash.cashMovements.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>{formatTime(new Date(item.createdAt)).hhMM}</TableCell>
                        <TableCell>{formatCashMovementNature({ nature: item.nature })}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>{formatCashMovementType({ type: item.type })}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function CashDetails({ cash, positiveAmount, negativeAmount, totalAmount }: {
    cash?: CurrentCash
    positiveAmount: number
    negativeAmount: number
    totalAmount: number
}) {

    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <h2 className='font-bold text-lg'>detalhes do caixa</h2>
            {!cash && (
                <NewCashDialog />
            )}
            <CardContent className='w-full flex flex-col h-full justify-between'>
                <div className='flex flex-col text-lg'>
                    <div className='flex text-green-600 font-bold items-center justify-between'><span>entradas:</span><span>{formatCurrency(positiveAmount)}</span></div>
                    <div className='flex text-red-600 font-bold items-center justify-between'><span>saídas:</span><span>{formatCurrency(negativeAmount)}</span></div>
                    <div className={`${totalAmount >= 0 ? "text-green-600" : "text-red-600"} flex font-bold items-center justify-between`}><span>saldo total:</span><span>{formatCurrency(totalAmount)}</span></div>
                </div>
                <CardFooter className="flex flex-col gap-2 mb-4">
                    <span>saldo total no caixa: {formatCurrency(totalAmount)}</span>
                </CardFooter>
            </CardContent>
        </Card>
    )
}

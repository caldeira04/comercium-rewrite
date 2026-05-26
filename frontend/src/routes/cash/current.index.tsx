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
import { ClockIcon } from 'lucide-react'
import NewCashDialog from '@/components/new-cash-dialog'
import { formatCashMovementNature, formatCashMovementType } from '@/utils/formatters'
import type { CurrentCash } from '@/lib/api-types'

export const Route = createFileRoute('/cash/current/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { currentCash, currentCashIsPending } = useCash()
    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            <div className='w-full flex flex-col'>
                <h1 className='p-4 font-bold text-2xl uppercase'>caixa diário - {currentCash && formatTime(new Date(currentCash.createdAt)).ddMMyy}</h1>
                {/* barra de pesquisa e tabela de itens */}
                <div className='w-full flex flex-col'>
                    {!currentCashIsPending && currentCash && (
                        <CashTable cash={currentCash} />
                    )}
                </div>
            </div>
            {/* barra lateral direita */}
            <div className='w-1/4 max-w-1/4'>
                {currentCashIsPending && (
                    <Spinner />
                )}
                <CashDetails
                    cash={currentCash}
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
                {cash.cashMovements.map((item) => (
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

function CashDetails({ cash }: {
    cash?: CurrentCash
}) {

    const positiveAmount = cash?.cashMovements
        .filter((item) => item.nature === "in")
        .reduce((acc, item) => acc + item.amount, 0) ?? 0

    const negativeAmount = cash?.cashMovements
        .filter((item) => item.nature === "out")
        .reduce((acc, item) => acc + item.amount, 0) ?? 0

    const totalAmount = positiveAmount - negativeAmount

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

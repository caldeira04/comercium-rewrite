import { Spinner } from '@/components/ui/spinner'
import { formatTime } from "@/utils/time"
import { Card, CardContent } from '@/components/ui/card'
import { useCash } from '@/hooks/use-cash'
import { createFileRoute } from '@tanstack/react-router'
import NewCashDialog from '@/components/new-cash-dialog'
import type { CurrentCash } from '@/lib/api-types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import NewCashMovementDialog from '@/components/new-cash-movement-dialog'
import CloseCashDialog from '@/components/close-cash-dialog'
import { CashOverview } from '@/components/cash/cash-overview'

export const Route = createFileRoute('/cash/current/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { currentCash, currentCashIsPending } = useCash()

    const isOpen = currentCash?.status === "open"

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
                    <CashOverview cash={currentCash} />
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

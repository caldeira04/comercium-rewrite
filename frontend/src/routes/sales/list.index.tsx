import { Spinner } from '@/components/ui/spinner'
import { useSales } from '@/hooks/use-sales'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/sales/list/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { sales, salesIsPending, salesIsError } = useSales()
    const [selectedSale, setSelectedSale] = useState<typeof sales | null>(null)

    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            <div className='w-full flex flex-col'>
                <div className='flex items-center justify-between w-full'>
                    <h1 className='p-4 font-bold text-2xl uppercase'>vendas</h1>
                </div>
                {salesIsPending && (
                    <Spinner />
                )}
                {salesIsError && (
                    <span>ocorreu um erro ao buscar os dados</span>
                )}
                {sales && (
                    <SalesTable sales={sales} onSelect={(sale) => setSelectedSale(sale)} />
                )}
            </div>
            <div className='w-1/4'>
                <SaleDetails sale={selectedSale} />
            </div>
        </div>
    )
}

interface SalesTableProps {
    sales: any[]
    onSelect: (saleId: unknown) => void
}

function SalesTable({ sales, onSelect }: SalesTableProps) {

    return (
        <Table className='min-h-full'>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>nome</TableHead>
                    <TableHead>telefone</TableHead>
                    <TableHead>documento</TableHead>
                    <TableHead>e-mail</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sales.map((s) => (
                    <TableRow key={s.id} onClick={() => onSelect(s)} className='cursor-pointer'>
                        <TableCell className="font-medium">{s.id}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.phone ?? ""}</TableCell>
                        <TableCell>{s.document ?? ""}</TableCell>
                        <TableCell className="text-right">{s.email ?? ""}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function SaleDetails({ sale }: { sale?: any }) {

    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <h2 className='font-bold text-xl text-center'>{
                sale ? "detalhes da venda" : "clique sobre uma venda para ver detalhes"
            }</h2>
            <CardContent className='w-full'>
                {sale && (
                    <div className='flex flex-col gap-4'>
                        {JSON.stringify(sale, null, 2)}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

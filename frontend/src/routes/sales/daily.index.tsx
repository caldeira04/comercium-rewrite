import { loaderCredentials } from '@/utils/auth'
import { createFileRoute } from '@tanstack/react-router'
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from '@/components/ui/card'

import products from "@/utils/products.json"
import { formatCurrency } from '@/utils/finance'

export const Route = createFileRoute('/sales/daily/')({
    loader: loaderCredentials,
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className='px-2 w-full flex self-start h-screen'>
            {/* barra de pesquisa e tabela de itens */}
            <div className='w-full flex flex-col'>
                <SearchBar />
                <ProductsTable />
            </div>
            {/* barra lateral direita */}
            <div className='w-1/4'>
                <SaleDetails />
            </div>
        </div>
    )
}

function SearchBar() {

    return (
        <Command className="rounded-lg w-full max-h-fit border">
            <CommandInput placeholder="busque por um produto ou escaneie o código de barras" />
            <CommandList>
                <CommandEmpty>nenhum produto encontrado</CommandEmpty>
                {products.map((p) => (
                    <CommandItem
                        value={p.id}
                    >
                        {p.name} - {p.gtin} - {formatCurrency(p.sellPrice)}
                    </CommandItem>
                ))}
            </CommandList>
        </Command>
    )
}

function ProductsTable() {

    return (
        <Table className='min-h-full'>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell className="font-medium">INV001</TableCell>
                    <TableCell>Paid</TableCell>
                    <TableCell>Credit Card</TableCell>
                    <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}

function SaleDetails() {
    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <CardContent>
                <span>R$ 389 </span>
            </CardContent>
        </Card>
    )

}

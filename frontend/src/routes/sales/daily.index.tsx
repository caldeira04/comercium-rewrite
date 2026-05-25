import { useClients } from "@/hooks/use-clients"
import type { Client } from "@/lib/types"
import { loaderCredentials } from '@/utils/auth'
import { createFileRoute } from '@tanstack/react-router'
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
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
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import NewClientDialog from "@/components/new-client-dialog"
import products from "@/utils/products.json"
import { formatCurrency } from '@/utils/finance'
import { useState } from 'react'
import { useSales } from '@/hooks/use-sales'
import { Button } from '@/components/ui/button'
import { Spinner } from "@/components/ui/spinner"

export const Route = createFileRoute('/sales/daily/')({
    loader: loaderCredentials,
    component: RouteComponent,
})

function RouteComponent() {
    const { currentSale, currentSaleIsPending, currentSaleIsError } = useSales()
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

    const canAddProduct = currentSale !== null

    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            {/* barra de pesquisa e tabela de itens */}
            <div className='w-full flex flex-col'>
                <SearchBar
                    disabled={!canAddProduct}
                    onSelectProduct={(productId) => setSelectedProduct(productId)}
                />
                <ProductsTable />
            </div>
            {/* barra lateral direita */}
            <div className='w-1/4'>
                {currentSaleIsPending && (
                    <Spinner />
                )}
                {currentSale && (
                    <SaleDetails sale={currentSale} productId={selectedProduct} />
                )}
            </div>
        </div>
    )
}

interface SearchBarProps {
    disabled: boolean
    onSelectProduct: (productId: string) => void
}

function SearchBar({
    disabled,
    onSelectProduct
}: SearchBarProps) {
    const [search, setSearch] = useState<string>("")

    return (
        <Command className="rounded-lg w-full h-1/3 border"
            filter={(value, search) => {
                if (value.toLowerCase().match(search.toLowerCase())) return 1
                return 0
            }}
        >
            <CommandInput placeholder="busque por um produto ou escaneie o código de barras"
                value={search}
                onValueChange={(e) => setSearch(e)}
                disabled={disabled}
            />
            <CommandList>
                {search && (
                    <CommandEmpty>nenhum produto encontrado</CommandEmpty>
                )}
                {search && products.map((p) => (
                    <CommandItem
                        key={p.id}
                        value={`${p.id}|${p.name} ${p.gtin}`}
                        onSelect={(val) => {
                            onSelectProduct(val.split("|")[0])
                            setSearch("")
                        }}
                    >
                        {p.name} - {p.gtin} - {formatCurrency(p.sellPrice)}
                        <CommandShortcut>↵</CommandShortcut>
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

interface SaleDetailsProps {
    sale: any
    productId?: string | null
}


function SaleDetails({
    sale,
    productId
}: SaleDetailsProps) {
    const { createSale, createSaleIsPending } = useSales()
    const { clients } = useClients()

    const [selectedClient, setSelectedClient] = useState<number | null>(null)
    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <h2 className='font-bold text-xl text-center'>{
                sale ? "detalhes da venda" : "inicie uma venda para começar"
            }</h2>
            <CardContent className='w-full'>
                {!sale ? (
                    <div className="flex flex-col gap-2">
                        <Combobox
                            items={clients as Client[]}
                            itemToStringLabel={(client: Client) => client.name}
                            itemToStringValue={(client: Client) => String(client.id)}
                            onValueChange={(client: Client | null) => {
                                if (client) setSelectedClient(client.id)
                            }}
                        >
                            <ComboboxInput placeholder="digite o nome de um cliente" />
                            <ComboboxContent>
                                <ComboboxEmpty><NewClientDialog /></ComboboxEmpty>
                                <ComboboxList>
                                    {(item) => (
                                        <ComboboxItem key={item.id} value={item}>
                                            {item.name}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                        <Button
                            className="w-full"
                            type="submit"
                            form="new-sale-form"
                            disabled={createSaleIsPending || selectedClient === null}
                            onClick={() => createSale(selectedClient!)}
                        >
                            {createSaleIsPending ? "cadastrando..." : "iniciar venda"}
                        </Button>
                    </div>
                ) : (
                    <div className='flex flex-col gap-4'>
                        {productId && (
                            <span>produto selecionado: {productId}</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )

}

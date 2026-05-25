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
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import NewClientDialog from "@/components/new-client-dialog"
import { formatCurrency } from '@/utils/finance'
import { useState } from 'react'
import { useSales } from '@/hooks/use-sales'
import { Button } from '@/components/ui/button'
import { Spinner } from "@/components/ui/spinner"
import { useProducts } from "@/hooks/use-products"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputGroup } from "@/components/ui/input-group"
import { ClockIcon, MinusIcon, PlusIcon } from "lucide-react"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute('/sales/daily/')({
    loader: loaderCredentials,
    component: RouteComponent,
})

function RouteComponent() {
    const { currentSale, currentSaleIsPending, currentSaleIsError } = useSales()
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
    const { products, productsIsPending } = useProducts()

    const canAddProduct = currentSale !== null

    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            {/* barra de pesquisa e tabela de itens */}
            <div className='w-full flex flex-col'>
                <SearchBar
                    disabled={!canAddProduct || productsIsPending}
                    products={products}
                    onSelectProduct={(productId) => setSelectedProduct(productId)}
                />
                {!currentSaleIsPending && (
                    <ProductsTable sale={currentSale} />
                )}
            </div>
            {/* barra lateral direita */}
            <div className='w-1/4 max-w-1/4'>
                {currentSaleIsPending ? (
                    <Spinner />
                ) : (
                    <SaleDetails
                        sale={currentSale}
                        productId={selectedProduct}
                        removeSelection={() => setSelectedProduct(null)}
                    />)}
            </div>
        </div>
    )
}

interface Product {
    id: number
    name: string
    sellPrice: number
    buyPrice: number
    gtin: string
    stockMovement: {
        quantity: number
        type: string
    }[]
}

interface SearchBarProps {
    disabled: boolean
    products: Product[]
    onSelectProduct: (productId: string) => void
}

function SearchBar({
    disabled,
    products,
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

interface Sale {
    createdAt: string
    updatedAt: string
    client: {
        name: string
    }
    saleItem: {
        quantity: number
        totalPrice: number
        unitPrice: number
        createdAt: number
        product: {
            name: string
            gtin?: string
            buyPrice?: number
            sellPrice?: number
        }
    }[]
}

interface ProductsTableProps {
    sale: Sale
}

function ProductsTable({ sale }: ProductsTableProps) {

    return (
        <Table className='min-h-full'>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]"><ClockIcon /></TableHead>
                    <TableHead>produto</TableHead>
                    <TableHead>preço unit.</TableHead>
                    <TableHead>quantidade</TableHead>
                    <TableHead>preço total</TableHead>
                    <TableHead className="text-right">ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sale.saleItem ? sale.saleItem.map((item) => (
                    <TableRow key={item.createdAt}>
                        <TableCell className="font-medium">
                            {formatTime(new Date(item.createdAt)).hhMM}
                        </TableCell>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                        <TableCell className="text-right"></TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell className="text-center">
                            <span>nenhum produto foi registrado na venda</span>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

interface SaleDetailsProps {
    sale: Sale
    productId?: string | null
    removeSelection: () => void
}


function SaleDetails({
    sale,
    productId,
    removeSelection
}: SaleDetailsProps) {
    const { createSale,
        createSaleIsPending,
        addProductToSale,
        addProductToSaleIsPending,
        addProductToSaleIsError,
        settleSale,
        settleSaleIsPending,
    } = useSales()
    const {
        singleProduct: product,
        singleProductIsPending,
    } = useProducts(Number(productId))
    const { clients } = useClients()
    const [selectedClient, setSelectedClient] = useState<number | null>(null)
    const [quantity, setQuantity] = useState<number>(1)

    async function confirmSelection() {
        await addProductToSale({
            productId: Number(productId),
            quantity
        })

        removeSelection()
        setQuantity(1)
        toast.success("item adicionado à venda com sucesso")
    }

    const saleTotal = sale.saleItem ? sale.saleItem.reduce((acc, value) => acc + value.totalPrice, 0) : 0

    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <h2 className='font-bold text-xl text-center'>{
                product
                    ? "adicionar produto?"
                    : sale ? "detalhes da venda"
                        : "inicie uma venda para começar"
            }</h2>
            <CardContent className='w-full flex flex-col h-full justify-between'>
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
                    <div className='flex flex-col gap-2'>
                        {productId && !singleProductIsPending && (
                            <>
                                <Label>nome</Label>
                                <Input value={product.name} disabled />
                                <Label>código de barras</Label>
                                <Input value={product.gtin} disabled />
                                <Label>valor de venda</Label>
                                <Input value={formatCurrency(product.sellPrice)} disabled />
                                <Label>quantidade</Label>
                                <InputGroup className="flex items-center justify-between">
                                    <Button
                                        onClick={() => setQuantity(val => val - 1)}
                                        className="w-1/3" variant={"ghost"}><MinusIcon /></Button>
                                    <Input
                                        className="text-center"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Number(e.target.value))}
                                    />
                                    <Button className="w-1/3"
                                        onClick={() => setQuantity(val => val + 1)}
                                        variant={"ghost"}><PlusIcon /></Button>
                                </InputGroup>
                                <Button
                                    onClick={() => removeSelection()}
                                    variant={"outline"}>cancelar adição</Button>
                                <Button
                                    disabled={addProductToSaleIsPending}
                                    onClick={() => confirmSelection()}
                                >adicionar produto</Button>
                            </>
                        )}
                    </div>
                )}
                {sale.saleItem && (
                    <CardFooter className="flex flex-col gap-2">
                        <span>valor total da venda: {formatCurrency(saleTotal)}</span>
                        <Button disabled={settleSaleIsPending} onClick={() => settleSale()}>encerrar venda</Button>
                    </CardFooter>
                )}
            </CardContent>
        </Card>
    )

}

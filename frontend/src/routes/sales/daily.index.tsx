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
import { formatCurrency, maskCurrency } from '@/utils/finance'
import { useState } from 'react'
import { useSales } from '@/hooks/use-sales'
import { Button } from '@/components/ui/button'
import { Spinner } from "@/components/ui/spinner"
import { useProducts } from "@/hooks/use-products"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputGroup } from "@/components/ui/input-group"
import { MinusIcon, PlusIcon } from "lucide-react"
import NewPaymentDialog from "@/components/new-payment-dialog"

export const Route = createFileRoute('/sales/daily/')({
    loader: loaderCredentials,
    component: RouteComponent,
})

function RouteComponent() {
    const { currentSale, currentSaleIsPending } = useSales()
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
    id: string
    createdAt: string
    updatedAt: string
    client: {
        id: number
        name: string
    }
    payment: {
        amount: number
    }[]
    saleItem: {
        quantity: number
        totalPrice: number
        unitPrice: number
        createdAt: number
        discount: number
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
                    <TableHead>produto</TableHead>
                    <TableHead>preço un.</TableHead>
                    <TableHead>qtd.</TableHead>
                    <TableHead>subtotal</TableHead>
                    <TableHead>desconto</TableHead>
                    <TableHead>total</TableHead>
                    <TableHead className="text-right">ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sale.saleItem ? sale.saleItem.map((item) => (
                    <TableRow key={item.createdAt}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                        <TableCell>{formatCurrency(item.discount)}</TableCell>
                        <TableCell>{formatCurrency(item.totalPrice - item.discount)}</TableCell>
                        <TableCell className="text-right"></TableCell>
                    </TableRow>
                )) : (
                    <></>
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
    const {
        createSale,
        createSaleIsPending,
        addProductToSale,
        addProductToSaleIsPending,
        updateSaleClient,
        updateSaleClientIsPending
    } = useSales()
    const {
        singleProduct: product,
        singleProductIsPending,
    } = useProducts(Number(productId))
    const { clients } = useClients()
    const [quantity, setQuantity] = useState<number>(1)
    const [discount, setDiscount] = useState<string>(maskCurrency("0"))

    async function confirmSelection() {
        if (quantity < 1) {
            toast.error("quantidade deve ser maior que 0")
            return
        }
        await addProductToSale({
            productId: Number(productId),
            quantity,
            discount: Number(discount.replace(/\D/g, ''))
        })

        removeSelection()
        setQuantity(1)
        toast.success("item adicionado à venda com sucesso")
    }

    const saleTotal = sale.saleItem ? sale.saleItem.reduce((acc, value) => acc + value.totalPrice, 0) : 0
    const discountTotal = sale.saleItem ? sale.saleItem.reduce((acc, value) => acc + value.discount, 0) : 0
    const paidTotal = sale.payment ? sale.payment.reduce((acc, value) => acc + value.amount, 0) : 0
    const actualTotal = saleTotal - discountTotal - paidTotal

    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <CardContent className="flex flex-col gap-4 items-center h-full">
                <h2 className="text-lg font-bold">{sale ? "detalhes da venda" : "inicie uma venda"}</h2>
                {!sale && (
                    <Button
                        disabled={createSaleIsPending}
                        onClick={() => createSale()}
                    >iniciar venda</Button>
                )}
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-center">{productId && !singleProductIsPending && product ? 'produto encontrado' : "nenhum produto selecionado"}</h3>
                    <div className="flex flex-col gap-2">
                        <Label>nome</Label>
                        <Input value={product ? product.name : ""} disabled />
                        <Label>valor de venda</Label>
                        <Input value={formatCurrency(product ? product.sellPrice : 0)} disabled />
                        {productId !== null && (
                            <>
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
                                <Label htmlFor="discount">desconto</Label>
                                <Input
                                    id="discount"
                                    value={discount}
                                    onChange={(e) => {
                                        setDiscount(maskCurrency(e.target.value))
                                    }}
                                />
                                <Button
                                    onClick={() => removeSelection()}
                                    variant={"outline"}>cancelar adição</Button>
                                <Button
                                    disabled={addProductToSaleIsPending || !product}
                                    onClick={() => confirmSelection()}
                                >adicionar produto</Button>
                            </>
                        )}
                    </div>
                </div>
                <div className="w-full flex flex-col gap-2">
                    <h3 className="text-lg text-center font-bold">cliente da venda</h3>
                    <Combobox
                        disabled={updateSaleClientIsPending}
                        items={clients as Client[]}
                        itemToStringValue={() => String(sale.client.id ?? "")}
                        itemToStringLabel={() => String(sale.client.name ?? "")}
                        onValueChange={async (client: Client | null) => {
                            if (client) {
                                await updateSaleClient({
                                    saleId: sale.id,
                                    clientId: client.id
                                })
                            }
                        }}
                    >
                        <ComboboxInput showClear placeholder="digite o nome de um cliente" />
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
                </div>
            </CardContent>
            <CardFooter className="mb-4 w-full flex-col items-start gap-2">
                <h3 className="text-xl font-bold">finalizar venda</h3>
                <div className="w-full flex items-center justify-between text-lg"><span>cliente:</span><span>{sale.client ? sale.client.name : "-"}</span></div>
                <div className="w-full flex items-center justify-between text-lg"><span>subtotal:</span><span>{formatCurrency(saleTotal)}</span></div>
                <div className="w-full flex items-center justify-between text-lg"><span>descontos:</span><span>{formatCurrency(discountTotal)}</span></div>
                <div className="w-full flex items-center justify-between text-lg"><span>pago:</span><span>{formatCurrency(paidTotal)}</span></div>
                <div className="w-full flex items-center justify-between text-lg"><span>total:</span><span>{formatCurrency(actualTotal)}</span></div>
                <NewPaymentDialog
                    totalAmount={actualTotal}
                    saleId={sale.id}
                />
            </CardFooter>
        </Card>
    )

}

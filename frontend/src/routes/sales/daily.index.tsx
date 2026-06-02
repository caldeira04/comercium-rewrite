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
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useSales } from '@/hooks/use-sales'
import { Button } from '@/components/ui/button'
import { Spinner } from "@/components/ui/spinner"
import { useProducts } from "@/hooks/use-products"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputGroup } from "@/components/ui/input-group"
import { MinusIcon, PencilIcon, PlusIcon } from "lucide-react"
import NewPaymentDialog from "@/components/new-payment-dialog"
import type { CurrentSale, CurrentSaleItem, Product } from "@/lib/api-types"

type SaleItemSelection =
    | { mode: "add", productId: string }
    | { mode: "edit", saleItem: CurrentSaleItem }

type ClientOption = Pick<Client, "id" | "name">

const GENERIC_PRODUCT_ID = "0"

export const Route = createFileRoute('/sales/daily/')({
    loader: loaderCredentials,
    component: RouteComponent,
})

function RouteComponent() {
    const {
        currentSale,
        currentSaleIsPending,
        createSale,
        createSaleIsPending
    } = useSales()
    const [selectedItem, setSelectedItem] = useState<SaleItemSelection | null>(null)
    const [productSearch, setProductSearch] = useState("")
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const { products, productsIsPending } = useProducts()
    const productSearchRef = useRef<HTMLInputElement>(null)
    const clientSearchRef = useRef<HTMLInputElement>(null)

    const canAddProduct = !!currentSale
    const actualTotal = currentSale ? getSaleRemainingTotal(currentSale) : 0

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (paymentDialogOpen) return

            if (event.key === "F1") {
                event.preventDefault()

                if (currentSaleIsPending || createSaleIsPending) return

                if (currentSale) {
                    toast.error("já existe uma venda em andamento")
                    return
                }

                createSale()
                return
            }

            if (event.key === "F2") {
                event.preventDefault()
                productSearchRef.current?.focus()
                return
            }

            if (event.key === "F3") {
                event.preventDefault()
                const latestSaleItem = currentSale?.saleItem[0]
                if (latestSaleItem) setSelectedItem({ mode: "edit", saleItem: latestSaleItem })
                return
            }

            if (event.key === "F4") {
                event.preventDefault()
                clientSearchRef.current?.focus()
                return
            }

            if (event.key === "F8" || event.key === "F10") {
                event.preventDefault()
                if (!currentSale) {
                    toast.error("inicie uma venda para adicionar pagamentos")
                    return
                }

                if (actualTotal <= 0) {
                    toast.error("não há valor pendente para pagamento")
                    return
                }

                setPaymentDialogOpen(true)
                return
            }

            if (
                isEditableTarget(event.target) &&
                event.key !== "Escape" &&
                !(event.key === "Backspace" && event.ctrlKey)
            ) {
                return
            }

            const productSearchInput = productSearchRef.current

            if (
                event.key === "Escape" &&
                productSearchInput &&
                document.activeElement === productSearchInput
            ) {
                event.preventDefault()
                productSearchInput.blur()
                return
            }

            if (event.key === "Escape" && selectedItem) {
                event.preventDefault()
                setSelectedItem(null)
                return
            }

            if (event.key === "Backspace" && event.ctrlKey) {
                const activeElement = document.activeElement
                if (activeElement === productSearchRef.current) {
                    event.preventDefault()
                    setProductSearch("")
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [actualTotal, createSale, createSaleIsPending, currentSale, currentSaleIsPending, paymentDialogOpen, selectedItem])

    useEffect(() => {
        if (
            selectedItem ||
            paymentDialogOpen ||
            currentSaleIsPending ||
            productsIsPending ||
            !currentSale
        ) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            if (isClientComboboxTarget(document.activeElement, clientSearchRef.current)) {
                return
            }

            productSearchRef.current?.focus()
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [currentSale, currentSaleIsPending, paymentDialogOpen, productsIsPending, selectedItem])

    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            {/* barra de pesquisa e tabela de itens */}
            <div className='w-full flex flex-col'>
                {products && !productsIsPending && (
                    <SearchBar
                        inputRef={productSearchRef}
                        disabled={!canAddProduct || productsIsPending}
                        products={products}
                        search={productSearch}
                        onSearchChange={setProductSearch}
                        onSelectProduct={(productId) => setSelectedItem({ mode: "add", productId })}
                        onSelectGenericProduct={() => setSelectedItem({ mode: "add", productId: GENERIC_PRODUCT_ID })}
                    />
                )}
                {!currentSaleIsPending && currentSale && (
                    <ProductsTable
                        sale={currentSale}
                        onEditSaleItem={(saleItem) => setSelectedItem({ mode: "edit", saleItem })}
                    />
                )}
            </div>
            {/* barra lateral direita */}
            <div className='w-1/4 max-w-1/4'>
                {currentSaleIsPending ? (
                    <Spinner />
                ) : (
                    <SaleDetails
                        sale={currentSale}
                        selection={selectedItem}
                        clientSearchRef={clientSearchRef}
                        paymentDialogOpen={paymentDialogOpen}
                        onPaymentDialogOpenChange={setPaymentDialogOpen}
                        removeSelection={() => setSelectedItem(null)}
                    />)}
            </div>
        </div>
    )
}

function getSaleRemainingTotal(sale: NonNullable<CurrentSale>) {
    const saleTotal = sale.saleItem.reduce((acc, value) => acc + value.totalPrice, 0)
    const discountTotal = sale.saleItem.reduce((acc, value) => acc + (value.discount ?? 0), 0)
    const paidTotal = sale.payment.reduce((acc, value) => acc + value.amount, 0)

    return saleTotal - discountTotal - paidTotal
}

function isCommandInputTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && target.dataset.slot === "command-input"
}

function isEditableTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false

    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
    )
}

function isClientComboboxTarget(
    target: Element | null,
    clientSearchInput: HTMLInputElement | null
) {
    if (!target || !clientSearchInput) return false

    const clientInputGroup = clientSearchInput.closest("[data-slot='input-group']")

    return (
        target === clientSearchInput ||
        !!clientInputGroup?.contains(target) ||
        !!target.closest("[data-slot='combobox-content']")
    )
}

interface SearchBarProps {
    inputRef: RefObject<HTMLInputElement | null>
    disabled: boolean
    products: Product[]
    search: string
    onSearchChange: (search: string) => void
    onSelectProduct: (productId: string) => void
    onSelectGenericProduct: () => void
}

function SearchBar({
    inputRef,
    disabled,
    products,
    search,
    onSearchChange,
    onSelectProduct,
    onSelectGenericProduct
}: SearchBarProps) {
    const searchableProducts = products.filter((product) => String(product.id) !== GENERIC_PRODUCT_ID)

    return (
        <div className="flex h-1/3 flex-col gap-2">
            <Button disabled={disabled} variant="outline" onClick={onSelectGenericProduct}>
                adicionar produto genérico
            </Button>
            <Command className="h-full w-full rounded-lg border"
                filter={(value, search) => {
                    if (value.toLowerCase().match(search.toLowerCase())) return 1
                    return 0
                }}
            >
                <CommandInput placeholder="busque por um produto ou escaneie o código de barras"
                    ref={inputRef}
                    value={search}
                    onValueChange={(e) => onSearchChange(e)}
                    disabled={disabled}
                />
                <CommandList>
                    {search && (
                        <CommandEmpty>nenhum produto encontrado</CommandEmpty>
                    )}
                    {search && searchableProducts.map((p) => (
                        <CommandItem
                            key={p.id}
                            value={`${p.id}|${p.name} ${p.gtin}`}
                            onSelect={(val) => {
                                onSelectProduct(val.split("|")[0])
                                onSearchChange("")
                            }}
                        >
                            {p.name} - {p.gtin ?? "sem GTIN"} - {formatCurrency(p.sellPrice)}
                            <CommandShortcut>↵</CommandShortcut>
                        </CommandItem>
                    ))}
                </CommandList>
            </Command>
        </div>
    )
}

interface ProductsTableProps {
    sale: NonNullable<CurrentSale>
    onEditSaleItem: (saleItem: CurrentSaleItem) => void
}

function ProductsTable({ sale, onEditSaleItem }: ProductsTableProps) {

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
                        <TableCell>{formatCurrency(item.discount ?? 0)}</TableCell>
                        <TableCell>{formatCurrency(item.totalPrice - (item.discount ?? 0))}</TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="outline"
                                onClick={() => onEditSaleItem(item)}
                            ><PencilIcon /></Button>
                        </TableCell>
                    </TableRow>
                )) : (
                    <></>
                )}
            </TableBody>
        </Table>
    )
}

interface SaleDetailsProps {
    sale?: CurrentSale
    selection?: SaleItemSelection | null
    clientSearchRef: RefObject<HTMLInputElement | null>
    paymentDialogOpen: boolean
    onPaymentDialogOpenChange: (open: boolean) => void
    removeSelection: () => void
}


function SaleDetails({
    sale,
    selection,
    clientSearchRef,
    paymentDialogOpen,
    onPaymentDialogOpenChange,
    removeSelection
}: SaleDetailsProps) {
    const {
        createSale,
        createSaleIsPending,
        addProductToSale,
        addProductToSaleIsPending,
        updateSaleItem,
        updateSaleItemIsPending,
        updateSaleClient,
        updateSaleClientIsPending
    } = useSales()
    const productId = selection?.mode === "add" ? selection.productId : null
    const selectedSaleItem = selection?.mode === "edit" ? selection.saleItem : null
    const {
        singleProduct: product,
        singleProductIsPending,
    } = useProducts(Number(productId))
    const { clients } = useClients()
    const [quantity, setQuantity] = useState<number>(1)
    const [discount, setDiscount] = useState<string>(maskCurrency("0"))
    const [unitPrice, setUnitPrice] = useState<string>(maskCurrency("0"))
    const quantityInputRef = useRef<HTMLInputElement>(null)
    const submitButtonRef = useRef<HTMLButtonElement>(null)
    const isGenericProduct = selection?.mode === "add"
        ? selection.productId === GENERIC_PRODUCT_ID
        : selection?.saleItem.productId === Number(GENERIC_PRODUCT_ID)

    useEffect(() => {
        if (selection?.mode === "edit") {
            setQuantity(selection.saleItem.quantity)
            setDiscount(maskCurrency(String(selection.saleItem.discount ?? 0)))
            setUnitPrice(maskCurrency(String(selection.saleItem.unitPrice)))
            return
        }

        setQuantity(1)
        setDiscount(maskCurrency("0"))
        setUnitPrice(maskCurrency("0"))
    }, [selection])

    const selectedItemName = selectedSaleItem?.product.name ?? product?.name ?? ""
    const selectedItemPrice = isGenericProduct ? Number(unitPrice.replace(/\D/g, "")) : selectedSaleItem?.unitPrice ?? product?.sellPrice ?? 0
    const hasSelection = !!selection
    const isEditMode = selection?.mode === "edit"
    const submitIsPending = isEditMode ? updateSaleItemIsPending : addProductToSaleIsPending
    const canSubmitSelection = hasSelection && !submitIsPending && (isEditMode || !!product)
    const selectionFocusKey =
        selection?.mode === "edit" ? `edit-${selection.saleItem.id}` :
            selection?.mode === "add" ? `add-${selection.productId}` :
                null

    const confirmSelection = useCallback(async () => {
        if (quantity < 1) {
            toast.error("quantidade deve ser maior que 0")
            return
        }

        const parsedDiscount = Number(discount.replace(/\D/g, ''))
        const parsedUnitPrice = Number(unitPrice.replace(/\D/g, ''))

        if (selection?.mode === "edit") {
            if (isGenericProduct && parsedUnitPrice < 1) {
                toast.error("informe o valor de venda do produto genérico")
                return
            }

            await updateSaleItem({
                saleItemId: selection.saleItem.id,
                quantity,
                discount: parsedDiscount,
                unitPrice: isGenericProduct ? parsedUnitPrice : undefined
            })

            removeSelection()
            toast.success("item da venda alterado com sucesso")
            return
        }

        if (selection?.mode !== "add") {
            toast.error("selecione um produto para continuar")
            return
        }

        if (selection.productId === GENERIC_PRODUCT_ID && parsedUnitPrice < 1) {
            toast.error("informe o valor de venda do produto genérico")
            return
        }

        await addProductToSale({
            productId: Number(selection.productId),
            quantity,
            discount: parsedDiscount,
            unitPrice: selection.productId === GENERIC_PRODUCT_ID ? parsedUnitPrice : undefined
        })

        removeSelection()
        setQuantity(1)
        setUnitPrice(maskCurrency("0"))
        toast.success("item adicionado à venda com sucesso")
    }, [addProductToSale, discount, isGenericProduct, quantity, removeSelection, selection, unitPrice, updateSaleItem])

    useEffect(() => {
        if (!canSubmitSelection || !selectionFocusKey) return

        const timeoutId = window.setTimeout(() => {
            submitButtonRef.current?.focus()
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [canSubmitSelection, selectionFocusKey])

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (!selection || paymentDialogOpen || submitIsPending) return

            if (event.key === "Enter") {
                if (isCommandInputTarget(event.target)) return

                event.preventDefault()
                confirmSelection()
                return
            }

            if (event.key === "+") {
                event.preventDefault()
                setQuantity((value) => value + 1)
                return
            }

            if (event.key === "-") {
                event.preventDefault()
                setQuantity((value) => Math.max(1, value - 1))
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [confirmSelection, paymentDialogOpen, selection, submitIsPending])

    if (!sale) {
        return (
            <Card className='w-full flex items-center justify-start h-screen'>
                <CardContent className="flex flex-col gap-4 items-center h-full">
                    <h2 className="text-lg font-bold">inicie uma venda</h2>
                    <Button
                        disabled={createSaleIsPending}
                        onClick={() => createSale()}
                    >iniciar venda</Button>
                </CardContent>
            </Card>
        )
    }

    const saleTotal = sale.saleItem ? sale.saleItem.reduce((acc, value) => acc + value.totalPrice, 0) : 0
    const discountTotal = sale.saleItem ? sale.saleItem.reduce((acc, value) => acc + (value.discount ?? 0), 0) : 0
    const paidTotal = sale.payment ? sale.payment.reduce((acc, value) => acc + value.amount, 0) : 0
    const actualTotal = saleTotal - discountTotal - paidTotal

    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <CardContent className="flex flex-col gap-4 items-center h-full">
                <h2 className="text-lg font-bold">detalhes da venda</h2>
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-bold text-center">{hasSelection && (isEditMode || (!singleProductIsPending && product)) ? 'produto encontrado' : "nenhum produto selecionado"}</h3>
                    <div className="flex flex-col gap-2">
                        <Label>nome</Label>
                        <Input value={selectedItemName} disabled />
                        <Label>valor de venda</Label>
                        <Input
                            value={isGenericProduct ? unitPrice : formatCurrency(selectedItemPrice)}
                            disabled={!isGenericProduct}
                            onChange={(event) => setUnitPrice(maskCurrency(event.target.value))}
                        />
                        {hasSelection && (
                            <>
                                <Label>quantidade</Label>
                                <InputGroup className="flex items-center justify-between">
                                    <Button
                                        onClick={() => setQuantity(val => val - 1)}
                                        className="w-1/3" variant={"ghost"}><MinusIcon /></Button>
                                    <Input
                                        ref={quantityInputRef}
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
                                    variant={"outline"}>cancelar {isEditMode ? "edição" : "adição"}</Button>
                                <Button
                                    ref={submitButtonRef}
                                    disabled={submitIsPending || (!isEditMode && !product)}
                                    onClick={() => confirmSelection()}
                                >{isEditMode ? "salvar alterações" : "adicionar produto"}</Button>
                            </>
                        )}
                    </div>
                </div>
                <div className="w-full flex flex-col gap-2">
                    <h3 className="text-lg text-center font-bold">cliente da venda</h3>
                    <Combobox
                        key={sale.client?.id ?? "no-client"}
                        disabled={updateSaleClientIsPending}
                        defaultValue={sale.client ?? null}
                        items={clients as ClientOption[]}
                        isItemEqualToValue={(item, value) => item?.id === value?.id}
                        itemToStringValue={(client) => String(client?.id ?? "")}
                        itemToStringLabel={(client) => String(client?.name ?? "")}
                        onValueChange={async (client: ClientOption | null) => {
                            if (client) {
                                await updateSaleClient({
                                    saleId: sale.id,
                                    clientId: client.id
                                })

                                window.setTimeout(() => {
                                    clientSearchRef.current?.blur()
                                }, 0)
                            }
                        }}
                    >
                        <ComboboxInput
                            ref={clientSearchRef}
                            showClear
                            placeholder="digite o nome de um cliente"
                        />
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
                    open={paymentDialogOpen}
                    onOpenChange={onPaymentDialogOpenChange}
                    totalAmount={actualTotal}
                    saleId={sale.id}
                />
            </CardFooter>
        </Card>
    )

}

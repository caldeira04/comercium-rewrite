import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createFileRoute } from "@tanstack/react-router"
import NewProductDialog from "@/components/new-product-dialog"
import StockMovementDialog from "@/components/stock-movement-dialog"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useProducts } from "@/hooks/use-products"
import type { Product, Products } from "@/lib/api-types"
import { formatCurrency, maskCurrency } from "@/utils/finance"
import { getApiErrorMessage } from "@/lib/api-error"

export const Route = createFileRoute("/products/list/")({
    component: RouteComponent,
})

function RouteComponent() {
    const { products, productsIsPending, productsIsError } = useProducts()
    const [search, setSearch] = useState("")
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    const filteredProducts = useMemo(() => {
        const catalogProducts = products?.filter((product) => product.id !== 0) ?? []
        const normalizedSearch = search.trim().toLowerCase()
        if (!normalizedSearch) return catalogProducts

        return catalogProducts.filter((product) =>
            product.name.toLowerCase().includes(normalizedSearch) ||
            product.gtin?.toLowerCase().includes(normalizedSearch)
        )
    }, [products, search])

    return (
        <div className="flex h-screen w-full gap-4 self-start overflow-hidden p-4">
            <div className="flex min-h-0 w-full flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold uppercase">catálogo de produtos</h1>
                        <p className="text-muted-foreground">cadastro, preços e saldo atual em estoque</p>
                    </div>
                    <NewProductDialog />
                </div>
                <Card className="min-h-0 flex-1">
                    <CardContent className="flex h-full min-h-0 flex-col gap-4">
                        <Input
                            className="max-w-lg"
                            placeholder="buscar por nome ou GTIN"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                        {productsIsPending && <Spinner />}
                        {productsIsError && <span>ocorreu um erro ao buscar os produtos</span>}
                        {!productsIsPending && filteredProducts.length === 0 && (
                            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                                nenhum produto encontrado
                            </div>
                        )}
                        {filteredProducts.length > 0 && (
                            <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
                                <ProductsTable products={filteredProducts} onSelect={setSelectedProduct} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="w-[360px] shrink-0">
                <ProductDetails product={selectedProduct} />
            </div>
        </div>
    )
}

function ProductsTable({ products, onSelect }: {
    products: NonNullable<Products>
    onSelect: (product: Product) => void
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[90px]">ID</TableHead>
                    <TableHead>produto</TableHead>
                    <TableHead>GTIN</TableHead>
                    <TableHead className="text-right">estoque</TableHead>
                    <TableHead className="text-right">custo</TableHead>
                    <TableHead className="text-right">venda</TableHead>
                    <TableHead className="text-right">margem</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.map((product) => {
                    const stock = getProductStock(product)
                    const margin = product.sellPrice - product.buyPrice

                    return (
                        <TableRow key={product.id} className="cursor-pointer" onClick={() => onSelect(product)}>
                            <TableCell className="font-medium">{product.id}</TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.gtin ?? "-"}</TableCell>
                            <TableCell className={stock <= 0 ? "text-right font-bold text-red-600" : "text-right"}>{stock}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.buyPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.sellPrice)}</TableCell>
                            <TableCell className={margin < 0 ? "text-right text-red-600" : "text-right text-green-600"}>{formatCurrency(margin)}</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

function ProductDetails({ product }: { product: Product | null }) {
    const { updateProduct, updateProductIsPending } = useProducts()
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState("")
    const [gtin, setGtin] = useState("")
    const [buyPrice, setBuyPrice] = useState("R$ 0,00")
    const [sellPrice, setSellPrice] = useState("R$ 0,00")

    useEffect(() => {
        if (!product) return

        setIsEditing(false)
        setName(product.name)
        setGtin(product.gtin ?? "")
        setBuyPrice(maskCurrency(String(product.buyPrice)))
        setSellPrice(maskCurrency(String(product.sellPrice)))
    }, [product])

    if (!product) {
        return (
            <Card className="h-full">
                <CardContent className="flex h-full items-center justify-center text-center text-muted-foreground">
                    selecione um produto para ver detalhes
                </CardContent>
            </Card>
        )
    }

    const stock = getProductStock(product)
    const margin = product.sellPrice - product.buyPrice

    async function handleSave() {
        if (!product) return
        if (!name.trim()) {
            toast.error("informe o nome do produto")
            return
        }

        try {
            await updateProduct({
                productId: product.id,
                name: name.trim(),
                gtin: gtin.trim() || null,
                buyPrice: Number(buyPrice.replace(/\D/g, "")),
                sellPrice: Number(sellPrice.replace(/\D/g, "")),
            })
            toast.success("produto atualizado com sucesso")
            setIsEditing(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao atualizar produto"))
        }
    }

    function cancelEdit() {
        if (!product) return

        setName(product.name)
        setGtin(product.gtin ?? "")
        setBuyPrice(maskCurrency(String(product.buyPrice)))
        setSellPrice(maskCurrency(String(product.sellPrice)))
        setIsEditing(false)
    }

    return (
        <Card className="h-full">
            <CardContent className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl font-bold">{product.name}</h2>
                    <p className="text-muted-foreground">#{product.id} {product.gtin ? `- ${product.gtin}` : ""}</p>
                </div>
                {isEditing ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="product-name">nome</Label>
                            <Input disabled={product.id === 0} id="product-name" value={name} onChange={(event) => setName(event.target.value)} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="product-gtin">GTIN</Label>
                            <Input disabled={product.id === 0} id="product-gtin" value={gtin} onChange={(event) => setGtin(event.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="product-buy-price">custo</Label>
                                <Input disabled={product.id === 0} id="product-buy-price" value={buyPrice} onChange={(event) => setBuyPrice(maskCurrency(event.target.value))} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="product-sell-price">venda</Label>
                                <Input disabled={product.id === 0} id="product-sell-price" value={sellPrice} onChange={(event) => setSellPrice(maskCurrency(event.target.value))} />
                            </div>
                        </div>
                        <Button variant="outline" onClick={cancelEdit}>cancelar edição</Button>
                        <Button disabled={updateProductIsPending || product.id === 0} onClick={handleSave}>salvar alterações</Button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <Metric label="estoque" value={String(stock)} />
                            <Metric label="movimentos" value={String(product.stockMovement.length)} />
                            <Metric label="custo" value={formatCurrency(product.buyPrice)} />
                            <Metric label="venda" value={formatCurrency(product.sellPrice)} />
                            <Metric label="margem" value={formatCurrency(margin)} />
                            <Metric label="markup" value={`${product.buyPrice > 0 ? ((margin / product.buyPrice) * 100).toFixed(1) : "0"}%`} />
                        </div>
                        <Button variant="outline" disabled={product.id === 0} onClick={() => setIsEditing(true)}>editar produto</Button>
                        <StockMovementDialog productId={product.id} />
                    </>
                )}
            </CardContent>
        </Card>
    )
}

function Metric({ label, value }: { label: string, value: string }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
        </div>
    )
}

function getProductStock(product: Product) {
    return product.stockMovement.reduce((total, movement) => {
        if (movement.type === "in") return total + movement.quantity
        if (movement.type === "out") return total - movement.quantity
        if (movement.type === "adjustment") return movement.quantity
        return total
    }, 0)
}

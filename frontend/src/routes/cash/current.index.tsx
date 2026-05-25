import { Spinner } from '@/components/ui/spinner'
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

export const Route = createFileRoute('/cash/current/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { currentCash, currentCashIsPending } = useCash()
    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            {/* barra de pesquisa e tabela de itens */}
            <div className='w-full flex flex-col'>
                {!currentCashIsPending && (
                    <CashTable cash={currentCash} />
                )}
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

function CashTable() {
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
                {sale.saleItem.map((item) => (
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
                ))}
            </TableBody>
        </Table>
    )
}

function cashDetails() {

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
                <CardFooter className="flex flex-col gap-2">
                    <span>valor total da venda: {formatCurrency(saleTotal)}</span>
                    <Button disabled={settleSaleIsPending} onClick={() => settleSale()}>encerrar venda</Button>
                </CardFooter>
            </CardContent>
        </Card>
    )
}

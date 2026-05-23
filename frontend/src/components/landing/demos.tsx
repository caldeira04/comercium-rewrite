import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import {
    Table,
    TableRow,
    TableHeader,
    TableHead,
    TableCell,
    TableBody
} from "@/components/ui/table";
import { useState, useRef } from "react";
import { formatCurrency, translatePaymentMethod } from "@/utils/finance";
import products from './filtered-products.json'
import sales from './sales-with-products.json'
import cashes from './cashes.json'
import coupons from './coupons.json'
import { Clock, Pencil, Plus, ArrowDown01, ArrowDown10, ArrowDownAZ, ArrowDownZA, Filter, Search, Printer, Info, FileText, Trash, Recycle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { formatTime } from "@/utils/time";

export function SalesDemo() {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [search, setSearch] = useState("")

    const total = sales.reduce((acc, item) => acc + item.value, 0)

    const sorted = sales.sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))

    return (
        <>
            <div className="flex items-center justify-between w-full mb-4">
                <Command>
                    <CommandInput ref={searchInputRef} value={search} onValueChange={setSearch} placeholder="pesquisar por nome ou código de barras" />
                    <CommandList>
                        <CommandEmpty>
                            <p className="text-sm text-muted-foreground">nenhum produto encontrado</p>
                        </CommandEmpty>
                        {search && products?.map((product) => (
                            <CommandItem
                                key={product.barcode}
                                value={`${product.name} ${product.barcode}`}
                                onSelect={() => toast("desativado na demonstração")}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center justify-between gap-3 w-full">
                                    <span>{product.name}</span>
                                    <span>{product.barcode}</span>
                                    <span>{formatCurrency(product.sellPrice)}</span>
                                    <CommandShortcut>↵</CommandShortcut>
                                </div>
                                <CommandSeparator />
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </div>
            <div className='flex items-center justify-between w-full mb-4'>
                <span className="text-sm text-muted-foreground">total do dia: {formatCurrency(total)}</span>
            </div>
            <div className='w-full flex px-4'>
                <Table className='w-full'>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Clock /></TableHead>
                            <TableHead>produto</TableHead>
                            <TableHead>subtotal</TableHead>
                            <TableHead>quantidade</TableHead>
                            <TableHead>total</TableHead>
                            <TableHead>forma de pagamento</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted?.map((sale) => {
                            const timestamp = formatTime(new Date(sale.createdAt)).hhMM;
                            return (
                                <TableRow key={sale.createdAt}>
                                    <TableCell>{timestamp}</TableCell>
                                    <TableCell>{sale.product ? sale.product.name : "VENDA GENÉRICA"}</TableCell>
                                    <TableCell>{formatCurrency(sale.product ? sale.product.sellPrice : sale.value)}</TableCell>
                                    <TableCell>{sale.amount}</TableCell>
                                    <TableCell>{formatCurrency(sale.product ? sale.product.sellPrice * sale.amount : sale.value)}</TableCell>
                                    <TableCell>{translatePaymentMethod(sale.paymentMethod as "cash" | "debit" | "credit" | "pix")}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table >
            </div>
        </>
    )
}

export function StockDemo() {
    const [filter, setFilter] = useState<"all" | "a-z" | "z-a" | "0-9" | "9-0">("all");

    products.sort((a, b) => {
        if (filter === "a-z") {
            return a.name.localeCompare(b.name);
        } else if (filter === "z-a") {
            return b.name.localeCompare(a.name);
        } else if (filter === "0-9") {
            return a.barcode.localeCompare(b.barcode, undefined, { numeric: true });
        } else if (filter === "9-0") {
            return b.barcode.localeCompare(a.barcode, undefined, { numeric: true });
        } return 0; // no sorting
    });

    return (
        <div className="flex flex-col items-center justify-between w-full mb-4">
            <div className="w-full flex items-center justify-between">
                <span />
                <div className="flex items-center gap-2">
                    <Button onClick={() => toast("desativado na demonstração")}>
                        <Plus />
                        adicionar produto
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="cursor-pointer">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>filtros</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setFilter("all")}>
                                remover filtro
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("a-z")}>
                                <ArrowDownAZ />
                                alfabética (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("z-a")}>
                                <ArrowDownZA />
                                alfabética (Z-A)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("0-9")}>
                                <ArrowDown01 />
                                código de barras (0-9)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilter("9-0")}>
                                <ArrowDown10 />
                                código de barras (9-0)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input type="text" placeholder="pesquisar" className="pl-8" onChange={() => toast("desativado na demonstração")} />
                    </div>
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>nome</TableHead>
                        <TableHead>classificação</TableHead>
                        <TableHead>código de barras</TableHead>
                        <TableHead>preço de compra</TableHead>
                        <TableHead>preço de venda</TableHead>
                        <TableHead>habilitado para NF</TableHead>
                        <TableHead>quantidade</TableHead>
                        <TableHead className="text-center">ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!products || products.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center">
                                nenhum produto encontrado
                            </TableCell>
                        </TableRow>
                    ) : products.map((product) => (
                        <TableRow key={product._id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>produto</TableCell>
                            <TableCell>{product.barcode}</TableCell>
                            <TableCell>{formatCurrency(product.buyPrice)}</TableCell>
                            <TableCell>{formatCurrency(product.sellPrice)}</TableCell>
                            <TableCell>sim</TableCell>
                            <TableCell>{Math.ceil(Math.random() * 100)}</TableCell>
                            <TableCell className="flex items-center justify-center gap-2">
                                <Tooltip delayDuration={500}>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline">
                                            <Pencil />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        editar produto
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip delayDuration={500}>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline">
                                            <Plus />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        adicionar nova movimentação
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))
                    }
                </TableBody>
            </Table>
        </div>
    )
}

export function CashDemo() {

    return (
        <div className="flex flex-col items-center justify-between w-full mb-4">
            <div className="w-full flex items-center justify-between">
                <div className="flex w-full justify-between items-center gap-2">
                    <span />
                    <Button onClick={() => toast("desativado na demonstração")}>
                        <Printer />
                        imprimir relatório
                    </Button>
                </div>
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">relatório de caixa</h1>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>status</TableHead>
                            <TableHead>abertura</TableHead>
                            <TableHead>fechamento</TableHead>
                            <TableHead>total</TableHead>
                            <TableHead>dinheiro</TableHead>
                            <TableHead>crédito</TableHead>
                            <TableHead>débito</TableHead>
                            <TableHead>pix</TableHead>
                            <TableHead>saídas</TableHead>
                            <TableHead>ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cashes.map((item) => (
                            <TableRow key={item.createdAt}>
                                <TableCell>
                                    {item.isOpen ? (
                                        <span className="text-green-600">aberto</span>
                                    ) : (
                                        <span className="text-red-600">fechado</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {new Date(item.createdAt!).toLocaleDateString("pt-BR")}
                                </TableCell>
                                <TableCell>
                                    {item.closedAt
                                        ? new Date(item.closedAt).toLocaleDateString("pt-BR")
                                        : "-"}
                                </TableCell>
                                <TableCell className="font-bold">
                                    {formatCurrency(
                                        item.total
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatCurrency(
                                        item.cashOut
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatCurrency(
                                        item.credit
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatCurrency(
                                        item.debit
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatCurrency(
                                        item.pix
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatCurrency(
                                        item.cashOut
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Tooltip delayDuration={500}>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" className="w-8 h-8 cursor-pointer" onClick={() => toast("desativado na demonstração")}>
                                                <Info className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            visualizar vendas do dia
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>

    )
}

export function CouponsDemo() {
    const sorted = coupons.sort((a, b) => b.number - a.number)

    return (
        <div className="w-full h-screen px-8 py-4 flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold">notas fiscais</h1>
            <div className="w-full flex flex-col items-center justify-between">
                {coupons ? (
                    <Table className='w-full'>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ambiente</TableHead>
                                <TableHead>número</TableHead>
                                <TableHead>status</TableHead>
                                <TableHead>data de solicitação</TableHead>
                                <TableHead>valor</TableHead>
                                <TableHead className="text-center">ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sorted.map((c) => (
                                <TableRow key={c?.createdAt}>
                                    <TableCell>{c?.environment === "test" ? "homologação" : "produção"}</TableCell>
                                    <TableCell>{c?.number}</TableCell>
                                    <TableCell>{c?.status === "autorizado" ? (
                                        <span className='px-2 py-1 rounded-sm bg-green-400 text-black'>autorizado</span>
                                    ) : c?.status === "cancelado" ? (
                                        <span className='px-2 py-1 rounded-sm bg-red-400 text-black'>cancelado</span>
                                    ) : (
                                        <div className='flex flex-col'>
                                            <span className='w-min px-2 py-1 rounded-sm bg-orange-400 text-black'>não autorizado</span>
                                            <span>motivo: {c?.message}</span>
                                        </div>

                                    )}</TableCell>
                                    <TableCell>{new Date(c?.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>{
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatCurrency(c.total)
                                    }</TableCell>
                                    <TableCell className="flex items-center justify-center">
                                        {c?.status === "nao_autorizado" ? (
                                            <Tooltip delayDuration={500}>
                                                <TooltipTrigger asChild>
                                                    <Button onClick={() => toast("desativado na demonstração")} className="cursor-pointer bg-orange-400"><Recycle /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    emitir novamente
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <div className='flex gap-1'>

                                                <Tooltip delayDuration={500}>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="destructive" className='cursor-pointer' onClick={() => toast("desativado na demonstração")}>
                                                            <Trash />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        cancelar nota
                                                    </TooltipContent>
                                                </Tooltip>

                                                <Tooltip delayDuration={500}>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="default" className='cursor-pointer' onClick={() => toast("desativado na demonstração")}>
                                                            <FileText />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        abrir arquivo pdf
                                                    </TooltipContent>
                                                </Tooltip>
                                                <Tooltip delayDuration={500}>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="secondary" className='cursor-pointer' onClick={() => toast("desativado na demonstração")}>
                                                            <FileText />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        abrir arquivo xml
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="w-full flex items-center justify-center">
                        <p className="text-muted-foreground">nenhum item encontrado</p>
                    </div>
                )}
            </div>
        </div >

    )
}

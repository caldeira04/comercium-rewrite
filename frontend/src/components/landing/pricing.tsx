import {
    Table,
    TableRow,
    TableHeader,
    TableHead,
    TableCell,
    TableBody,
    TableFooter
} from "@/components/ui/table";

export default function Pricing() {

    return (
        <div className="w-full overflow-x-auto rounded-2xl border-1">
            <Table className="w-full">
                <TableHeader>
                    <TableRow className="h-16 md:h-24">
                        <TableHead className="text-center text-lg font-bold whitespace-normal uppercase md:text-2xl">
                            plano básico
                        </TableHead>
                        <TableHead className="text-center text-lg font-bold whitespace-normal uppercase md:text-2xl">
                            plano fiscal
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow className="text-center h-16">
                        <TableCell>registro de vendas</TableCell>
                        <TableCell>tudo do plano básico</TableCell>
                    </TableRow>
                    <TableRow className="text-center h-16">
                        <TableCell>cadastro de produtos</TableCell>
                        <TableCell>emissão descomplicada de nfc-e</TableCell>
                    </TableRow>
                    <TableRow className="text-center h-16">
                        <TableCell>controle de caixa diário</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                    <TableRow className="text-center h-16">
                        <TableCell>controle de estoque</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableBody>
                <TableFooter>
                    <TableRow className="text-center h-20 bg-muted font-bold text-base md:text-xl">
                        <TableCell>R$ 49/mês</TableCell>
                        <TableCell>R$ 119/mês</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    )
}

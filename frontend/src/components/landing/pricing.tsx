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
        <div className="border-1 rounded-2xl w-full">
            <Table className="w-full">
                <TableHeader>
                    <TableRow className="h-24">
                        <TableHead className="text-center font-bold text-2xl uppercase">
                            plano básico
                        </TableHead>
                        <TableHead className="text-center font-bold text-2xl uppercase">
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
                    <TableRow className="text-center h-20 bg-muted font-bold text-xl">
                        <TableCell>R$ 49/mês</TableCell>
                        <TableCell>R$ 119/mês</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    )
}

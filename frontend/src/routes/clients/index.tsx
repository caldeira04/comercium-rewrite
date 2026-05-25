import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import NewClientDialog from '@/components/new-client-dialog'
import { useClients } from '@/hooks/use-clients'
import { Spinner } from '@/components/ui/spinner'
import { type Client } from "@/lib/types"
import { useState } from 'react'
import NewClientForm from '@/components/new-client-form'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/clients/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { clients, clientsIsPending, clientsIsError } = useClients()
    const [selectedClient, setSelectedClient] = useState<Client | null>()

    return (
        <div className='p-2 gap-2 w-full flex self-start h-screen'>
            <div className='w-full flex flex-col'>
                <div className='flex items-center justify-between w-full'>
                    <h1 className='p-4 font-bold text-2xl uppercase'>clientes</h1>
                    <NewClientDialog />
                </div>
                {clientsIsPending && (
                    <Spinner />
                )}
                {clientsIsError && (
                    <span>ocorreu um erro ao buscar os dados</span>
                )}
                {clients && (
                    <ClientsTable clients={clients} onSelect={(client) => setSelectedClient(client)} />
                )}
            </div>
            <div className='w-1/4'>
                <ClientDetails client={selectedClient} />
            </div>
        </div>
    )
}

interface ClientsTableProps {
    clients: Client[]
    onSelect: (clientId: Client) => void
}

function ClientsTable({ clients, onSelect }: ClientsTableProps) {

    return (
        <Table className='min-h-full'>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>nome</TableHead>
                    <TableHead>telefone</TableHead>
                    <TableHead>documento</TableHead>
                    <TableHead>e-mail</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {clients.map((c) => (
                    <TableRow key={c.id} onClick={() => onSelect(c)} className='cursor-pointer'>
                        <TableCell className="font-medium">{c.id}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.phone ?? ""}</TableCell>
                        <TableCell>{c.document ?? ""}</TableCell>
                        <TableCell className="text-right">{c.email ?? ""}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function ClientDetails({ client }: { client?: Client | null }) {

    const { editClientIsPending } = useClients()

    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <h2 className='font-bold text-xl text-center'>{
                client ? "detalhes do cliente" : "clique sobre um cliente para ver detalhes"
            }</h2>
            <CardContent className='w-full'>
                {client && (
                    <div className='flex flex-col gap-4'>
                        <NewClientForm client={client} />
                        <Button
                            type="submit"
                            form="new-client-form"
                            disabled={editClientIsPending || client.id === 0}
                        >
                            {editClientIsPending ? "atualizando..." : "atualizar cliente"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

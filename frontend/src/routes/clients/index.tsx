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
import { useMemo, useState } from 'react'
import NewClientForm from '@/components/new-client-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/clients/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { clients, clientsIsPending, clientsIsError } = useClients()
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [search, setSearch] = useState("")
    const [isEditing, setIsEditing] = useState(false)

    const filteredClients = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase()
        if (!clients || !normalizedSearch) return clients ?? []

        return clients.filter((client) =>
            client.name.toLowerCase().includes(normalizedSearch) ||
            client.document?.toLowerCase().includes(normalizedSearch) ||
            client.phone?.toLowerCase().includes(normalizedSearch) ||
            client.email?.toLowerCase().includes(normalizedSearch)
        )
    }, [clients, search])

    return (
        <div className='p-4 gap-4 w-full flex self-start h-screen'>
            <div className='w-full flex flex-col gap-4'>
                <div className='flex items-center justify-between w-full'>
                    <div>
                        <h1 className='font-bold text-2xl uppercase'>clientes</h1>
                        <p className='text-muted-foreground'>cadastro e dados de contato dos clientes</p>
                    </div>
                    <NewClientDialog />
                </div>
                <Input
                    className='max-w-lg'
                    placeholder='buscar por nome, documento, telefone ou e-mail'
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                {clientsIsPending && (
                    <Spinner />
                )}
                {clientsIsError && (
                    <span>ocorreu um erro ao buscar os dados</span>
                )}
                {clients && filteredClients.length === 0 && (
                    <Card><CardContent className='text-center text-muted-foreground'>nenhum cliente encontrado</CardContent></Card>
                )}
                {filteredClients.length > 0 && (
                    <ClientsTable clients={filteredClients} onSelect={(client) => { setSelectedClient(client); setIsEditing(false) }} />
                )}
            </div>
            <div className='w-[380px] shrink-0'>
                <ClientDetails
                    client={selectedClient}
                    isEditing={isEditing}
                    onCancelEdit={() => setIsEditing(false)}
                    onEdit={() => setIsEditing(true)}
                />
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

function ClientDetails({ client, isEditing, onEdit, onCancelEdit }: {
    client?: Client | null,
    isEditing: boolean,
    onEdit: () => void,
    onCancelEdit: () => void
}) {

    const { editClientIsPending } = useClients()

    return (
        <Card className='w-full flex items-center justify-start h-screen'>
            <h2 className='font-bold text-xl text-center'>{
                client ? "detalhes do cliente" : "clique sobre um cliente para ver detalhes"
            }</h2>
            <CardContent className='w-full'>
                {client && !isEditing && (
                    <div className='flex flex-col gap-3'>
                        <Info label='nome' value={client.name} />
                        <Info label='telefone' value={client.phone ?? "-"} />
                        <Info label='documento' value={client.document ?? "-"} />
                        <Info label='e-mail' value={client.email ?? "-"} />
                        <Button onClick={onEdit}>editar cliente</Button>
                    </div>
                )}
                {client && isEditing && (
                    <div className='flex flex-col gap-4'>
                        <NewClientForm client={client} />
                        <Button variant="outline" onClick={onCancelEdit}>cancelar edição</Button>
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

function Info({ label, value }: { label: string, value: string }) {
    return <div className='rounded-lg border p-3'><p className='text-xs uppercase text-muted-foreground'>{label}</p><p className='font-bold'>{value}</p></div>
}

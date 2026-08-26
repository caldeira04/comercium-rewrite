import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination } from "@/components/admin/pagination"
import { useAdminAudit } from "@/hooks/use-admin"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/audit/")({
    component: RouteComponent,
})

const PAGE_SIZE = 50

const ACTION_LABELS: Record<string, string> = {
    "admin.login": "login de administrador",
    "admin.bootstrap": "criação do owner inicial",
    "admin.create": "criação de administrador",
    "admin.update": "atualização de administrador",
    "admin.delete": "remoção de administrador",
    "tenant.update": "atualização de tenant",
    "tenant.delete": "exclusão de tenant",
    "user.enable": "ativação de usuário",
    "user.disable": "desativação de usuário",
    "impersonation.start": "início de impersonação",
    "flag.create": "criação de feature flag",
    "flag.update": "atualização de feature flag",
    "flag.delete": "remoção de feature flag",
    "announcement.create": "criação de comunicado",
    "announcement.update": "atualização de comunicado",
    "announcement.delete": "remoção de comunicado",
}

function RouteComponent() {
    const [action, setAction] = useState("all")
    const [page, setPage] = useState(1)

    const { data, isPending, isError } = useAdminAudit({
        action: action === "all" ? undefined : action,
        page,
        pageSize: PAGE_SIZE,
    })

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">auditoria</h1>
                <p className="text-muted-foreground">
                    registro de ações administrativas — somente leitura, sem exclusão
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
                    <SelectTrigger><SelectValue placeholder="ação" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">todas as ações</SelectItem>
                        {Object.keys(ACTION_LABELS).map((key) => (
                            <SelectItem key={key} value={key}>{ACTION_LABELS[key]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isPending && <Spinner />}
            {isError && <p className="text-muted-foreground">ocorreu um erro ao buscar a auditoria</p>}

            {data && data.events.length === 0 && (
                <Card>
                    <CardContent className="text-center text-muted-foreground">nenhum evento registrado</CardContent>
                </Card>
            )}

            {data && data.events.length > 0 && (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>quando</TableHead>
                                <TableHead>ator</TableHead>
                                <TableHead>ação</TableHead>
                                <TableHead>alvo</TableHead>
                                <TableHead>resultado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.events.map((event) => (
                                <TableRow key={event.id}>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">
                                        {formatTime(new Date(event.createdAt)).ddMMyy}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {event.adminName ?? "sistema"}
                                        {event.adminLogin && <span className="block text-xs text-muted-foreground">{event.adminLogin}</span>}
                                    </TableCell>
                                    <TableCell>{ACTION_LABELS[event.action] ?? event.action}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">{event.targetType ?? "-"}</span>
                                            {event.targetId && <span className="font-mono text-xs">{event.targetId.slice(0, 8)}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={event.result === "success" ? "secondary" : "destructive"}>
                                            {event.result}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Pagination
                        page={data.pagination.page}
                        totalPages={data.pagination.totalPages}
                        total={data.pagination.total}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    )
}
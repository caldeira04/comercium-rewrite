import { Link, createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ArrowRightIcon, SearchIcon, UserRoundCheckIcon, UserRoundXIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Pagination } from "@/components/admin/pagination"
import { useAdminUsers } from "@/hooks/use-admin"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/users/")({
    component: RouteComponent,
})

const PAGE_SIZE = 25

function RouteComponent() {
    const [q, setQ] = useState("")
    const [page, setPage] = useState(1)

    const users = useAdminUsers({ q: q || undefined, page, pageSize: PAGE_SIZE })

    async function handleToggle(userId: string, isActive: boolean) {
        try {
            await users.setUserActive({ userId, isActive: !isActive })
            toast.success(isActive ? "usuário desativado" : "usuário ativado")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao atualizar usuário"))
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">usuários</h1>
                <p className="text-muted-foreground">todos os usuários de todos os tenants</p>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative w-full max-w-sm">
                    <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setPage(1) }}
                        placeholder="buscar por e-mail..."
                    />
                </div>
            </div>

            {users.isPending && <Spinner />}
            {users.isError && <p className="text-muted-foreground">ocorreu um erro ao buscar os usuários</p>}

            {users.data && users.data.users.length === 0 && (
                <Card>
                    <CardContent className="text-center text-muted-foreground">nenhum usuário encontrado</CardContent>
                </Card>
            )}

            {users.data && users.data.users.length > 0 && (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>usuário</TableHead>
                                <TableHead>tenant</TableHead>
                                <TableHead>status</TableHead>
                                <TableHead>último login</TableHead>
                                <TableHead>criado</TableHead>
                                <TableHead className="text-right">ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.login}</TableCell>
                                    <TableCell>
                                        <Link to="/admin/tenants/$tenantId" params={{ tenantId: user.tenantId }} className="hover:underline">
                                            {user.tenantName}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? "secondary" : "outline"}>
                                            {user.isActive ? "ativo" : "desativado"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {user.lastLogin ? formatTime(new Date(user.lastLogin)).ddMMyy : "nunca"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{formatTime(new Date(user.createdAt)).ddMMyy}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button asChild variant="ghost" size="sm">
                                                <Link to="/admin/tenants/$tenantId" params={{ tenantId: user.tenantId }}>
                                                    tenant <ArrowRightIcon className="size-3.5" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={users.setUserActiveIsPending}
                                                onClick={() => handleToggle(user.id, user.isActive)}
                                            >
                                                {user.isActive ? <UserRoundXIcon className="size-3.5" /> : <UserRoundCheckIcon className="size-3.5" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Pagination
                        page={users.data.pagination.page}
                        totalPages={users.data.pagination.totalPages}
                        total={users.data.pagination.total}
                        pageSize={PAGE_SIZE}
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    )
}
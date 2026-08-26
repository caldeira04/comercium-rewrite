import { Link, createFileRoute } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { ArrowRightIcon, SearchIcon } from "lucide-react"
import type { TenantListItem } from "@/lib/admin-api-types"
import type {TenantStatus} from "@/hooks/use-admin";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/admin/pagination"
import { StatusBadge, SubscriptionBadge } from "@/components/admin/status-badge"
import {  useAdminTenants } from "@/hooks/use-admin"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/tenants/")({
    component: RouteComponent,
})

const PAGE_SIZE = 20

function RouteComponent() {
    const [q, setQ] = useState("")
    const [debouncedQ, setDebouncedQ] = useState("")
    const [status, setStatus] = useState<TenantStatus>("all")
    const [plan, setPlan] = useState("all")
    const [sort, setSort] = useState("createdAt_desc")
    const [page, setPage] = useState(1)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    const { data, isPending, isError } = useAdminTenants({
        q: debouncedQ || undefined,
        status: status === "all" ? undefined : status,
        plan: plan === "all" ? undefined : plan,
        sort,
        page,
        pageSize: PAGE_SIZE,
    })

    function handleSearch(value: string) {
        setQ(value)
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            setDebouncedQ(value)
            setPage(1)
        }, 250)
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">tenants</h1>
                <p className="text-muted-foreground">empresas e lojas cadastradas na plataforma</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-sm">
                    <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        value={q}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="buscar por nome, slug, CNPJ ou e-mail..."
                    />
                </div>
                <Select value={status} onValueChange={(v) => { setStatus(v as TenantStatus); setPage(1) }}>
                    <SelectTrigger><SelectValue placeholder="status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">todos</SelectItem>
                        <SelectItem value="active">ativos</SelectItem>
                        <SelectItem value="inactive">inativos</SelectItem>
                        <SelectItem value="deleted">excluídos</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={plan} onValueChange={(v) => { setPlan(v); setPage(1) }}>
                    <SelectTrigger><SelectValue placeholder="plano" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">todos os planos</SelectItem>
                        <SelectItem value="none">sem plano</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
                    <SelectTrigger><SelectValue placeholder="ordenação" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="createdAt_desc">mais recentes</SelectItem>
                        <SelectItem value="createdAt_asc">mais antigos</SelectItem>
                        <SelectItem value="name_asc">nome (A–Z)</SelectItem>
                        <SelectItem value="name_desc">nome (Z–A)</SelectItem>
                        <SelectItem value="updatedAt_desc">última atualização</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isPending && <Spinner />}
            {isError && <p className="text-muted-foreground">ocorreu um erro ao buscar os tenants</p>}

            {data && data.tenants.length === 0 && (
                <Card>
                    <CardContent className="text-center text-muted-foreground">nenhum tenant encontrado</CardContent>
                </Card>
            )}

            {data && data.tenants.length > 0 && (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>empresa</TableHead>
                                <TableHead>CNPJ/CPF</TableHead>
                                <TableHead>status</TableHead>
                                <TableHead>plano</TableHead>
                                <TableHead>criado</TableHead>
                                <TableHead>atualizado</TableHead>
                                <TableHead className="text-right">ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.tenants.map((tenant: TenantListItem) => (
                                <TableRow key={tenant.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{tenant.name}</span>
                                            <span className="text-xs text-muted-foreground">@{tenant.slug}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{tenant.document}</TableCell>
                                    <TableCell>
                                        <StatusBadge active={tenant.isActive} deleted={!!tenant.deletedAt} />
                                    </TableCell>
                                    <TableCell>
                                        <SubscriptionBadge status={tenant.subscriptionStatusId} planId={tenant.planId} />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{formatTime(new Date(tenant.createdAt)).ddMMyy}</TableCell>
                                    <TableCell className="text-muted-foreground">{formatTime(new Date(tenant.updatedAt)).ddMMyy}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link to="/admin/tenants/$tenantId" params={{ tenantId: tenant.id }}>
                                                detalhes <ArrowRightIcon className="size-3.5" />
                                            </Link>
                                        </Button>
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
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { ExternalLinkIcon, PencilIcon, TrashIcon, UserRoundCheckIcon, UserRoundXIcon } from "lucide-react"
import type { TenantDetail } from "@/lib/admin-api-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Metric } from "@/components/metric"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { StatusBadge, SubscriptionBadge } from "@/components/admin/status-badge"
import { useAdminTenant, useAdminTenantMutations, useAdminUsers, useImpersonate } from "@/hooks/use-admin"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatCurrency } from "@/utils/finance"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/tenants/$tenantId")({
    component: RouteComponent,
})

function RouteComponent() {
    const { tenantId } = Route.useParams()
    const { data, isPending, isError } = useAdminTenant(tenantId)

    if (isPending) return <Spinner />
    if (isError) return <p className="text-muted-foreground">não foi possível carregar o tenant</p>

    return (
        <div className="flex flex-col gap-4">
            <TenantHeader tenant={data.tenant} database={data.database} />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric label="usuários" value={String(data.userCount)} detail={`${data.users.length} na base`} />
                <Metric label="produtos" value={String(data.stats?.products ?? "-")} detail="cadastrados" />
                <Metric label="vendas" value={String(data.stats?.sales ?? "-")} detail={formatCurrency(data.stats?.salesAmount ?? 0)} />
                <Metric label="vendas hoje" value={String(data.stats?.salesToday ?? "-")} detail={formatCurrency(data.stats?.salesTodayAmount ?? 0)} />
            </div>
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">visão geral</TabsTrigger>
                    <TabsTrigger value="users">usuários</TabsTrigger>
                    <TabsTrigger value="sales">vendas</TabsTrigger>
                    <TabsTrigger value="fiscal">fiscal</TabsTrigger>
                    <TabsTrigger value="errors">erros</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <OverviewTab tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="users">
                    <UsersTab tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="sales">
                    <SalesTab tenantId={tenantId} />
                </TabsContent>
                <TabsContent value="fiscal">
                    <FiscalTab />
                </TabsContent>
                <TabsContent value="errors">
                    <ErrorsTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function TenantHeader({ tenant, database }: { tenant: TenantDetail["tenant"], database: boolean }) {
    const navigate = useNavigate()
    const { updateTenant, deleteTenant } = useAdminTenantMutations()
    const [editing, setEditing] = useState(false)
    const [deleting, setDeleting] = useState(false)

    async function handleDelete() {
        try {
            await deleteTenant(tenant.id)
            toast.success("tenant excluído")
            navigate({ to: "/admin/tenants" })
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao excluir tenant"))
        }
    }

    async function handleSave(settings: Record<string, unknown>) {
        try {
            await updateTenant({ tenantId: tenant.id, settings })
            toast.success("tenant atualizado")
            setEditing(false)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao atualizar tenant"))
        }
    }

    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold">{tenant.name}</h1>
                    <StatusBadge active={tenant.isActive} deleted={!!tenant.deletedAt} />
                    <Badge variant={database ? "secondary" : "destructive"}>{database ? "banco ok" : "banco ausente"}</Badge>
                </div>
                <p className="text-muted-foreground">@{tenant.slug} · {tenant.document} · {tenant.email}</p>
                <div className="mt-1">
                    <SubscriptionBadge status={tenant.subscriptionStatusId} planId={tenant.planId} />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                    <a href="/dashboard" target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="size-3.5" /> abrir app
                    </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <PencilIcon className="size-3.5" /> editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleting(true)}>
                    <TrashIcon className="size-3.5" /> excluir
                </Button>
            </div>

            <EditTenantDialog
                open={editing}
                onOpenChange={setEditing}
                tenant={tenant}
                onSave={handleSave}
            />

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title="excluir tenant"
                description={`Esta ação remove "${tenant.name}" da plataforma. A exclusão é permanente e registrada na auditoria.`}
                confirmLabel="excluir tenant"
                requireText={tenant.name}
                onConfirm={handleDelete}
            />
        </div>
    )
}

function OverviewTab({ tenantId }: { tenantId: string }) {
    const { data } = useAdminTenant(tenantId)
    if (!data) return null
    const t = data.tenant

    return (
        <Card>
            <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <InfoField label="razão social" value={t.legalName} />
                    <InfoField label="telefone" value={t.phone} />
                    <InfoField label="cidade/UF" value={`${t.city ?? "-"} / ${t.state ?? "-"}`} />
                    <InfoField label="endereço" value={[t.street, t.number].filter(Boolean).join(", ") || "-"} />
                    <InfoField label="fuso horário" value={t.timezone} />
                    <InfoField label="moeda" value={t.currency} />
                    <InfoField label="criado em" value={formatTime(new Date(t.createdAt)).ddMMyy} />
                    <InfoField label="assinatura expira" value={t.subscriptionExpireDate} />
                </div>
                {data.stats && (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <Metric label="vendas quitadas" value={String(data.stats.settledSales)} detail="do total de vendas" />
                        <Metric label="clientes" value={String(data.stats.clients)} detail="cadastrados" />
                        <Metric label="pagamentos" value={String(data.stats.payments)} detail="registrados" />
                        <Metric label="caixas abertos" value={String(data.stats.openCashes)} detail="agora" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function InfoField({ label, value }: { label: string, value: string | null | undefined }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value ?? "-"}</p>
        </div>
    )
}

function UsersTab({ tenantId }: { tenantId: string }) {
    const users = useAdminUsers({ tenantId, pageSize: 50 })
    const impersonate = useImpersonate()
    const navigate = useNavigate()

    async function handleImpersonate(userId: string, name: string) {
        try {
            const result = await impersonate.mutateAsync(userId)
            document.cookie = `session=${result.token}; path=/; SameSite=Lax; max-age=604800`
            toast.success(`acessando como ${result.tenant.name} (${name})`)
            navigate({ to: "/dashboard" })
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Falha ao acessar como usuário"))
        }
    }

    async function handleToggle(userId: string, isActive: boolean) {
        try {
            await users.setUserActive({ userId, isActive: !isActive })
            toast.success(isActive ? "usuário desativado" : "usuário ativado")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao atualizar usuário"))
        }
    }

    if (users.isPending) return <Spinner />

    return (
        <Card>
            <CardContent className="flex flex-col gap-3">
                <h2 className="font-bold">usuários do tenant</h2>
                {users.data && users.data.users.length === 0 && (
                    <p className="text-muted-foreground">nenhum usuário cadastrado</p>
                )}
                {users.data && users.data.users.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>usuário</TableHead>
                                <TableHead>status</TableHead>
                                <TableHead>último login</TableHead>
                                <TableHead className="text-right">ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.login}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? "secondary" : "outline"}>
                                            {user.isActive ? "ativo" : "desativado"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {user.lastLogin ? formatTime(new Date(user.lastLogin)).ddMMyy : "nunca"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="outline" size="sm" onClick={() => handleImpersonate(user.id, user.login)}>
                                                acessar como
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggle(user.id, user.isActive)}
                                                disabled={users.setUserActiveIsPending}
                                            >
                                                {user.isActive ? <UserRoundXIcon className="size-3.5" /> : <UserRoundCheckIcon className="size-3.5" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}

function SalesTab({ tenantId }: { tenantId: string }) {
    const { data } = useAdminTenant(tenantId)
    if (!data?.stats) return null
    const stats = data.stats

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Metric label="total vendas" value={String(stats.sales)} detail={formatCurrency(stats.salesAmount)} />
                <Metric label="quitadas" value={String(stats.settledSales)} detail="sem canceladas" />
                <Metric label="hoje" value={String(stats.salesToday)} detail={formatCurrency(stats.salesTodayAmount)} />
                <Metric label="pagamentos" value={String(stats.payments)} detail="em todas as vendas" />
            </div>
            <Card>
                <CardContent className="flex flex-col gap-3">
                    <h2 className="font-bold">últimas vendas</h2>
                    {stats.recentSales.length === 0 ? (
                        <p className="text-muted-foreground">nenhuma venda registrada</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>data</TableHead>
                                    <TableHead>status</TableHead>
                                    <TableHead className="text-right">total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.recentSales.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-mono text-xs">{sale.id.split("-")[0]}</TableCell>
                                        <TableCell>{formatTime(new Date(sale.createdAt)).ddMMyy}</TableCell>
                                        <TableCell>
                                            <Badge variant={sale.settledAt ? "secondary" : "outline"}>
                                                {sale.settledAt ? "quitada" : "pendente"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function FiscalTab() {
    return (
        <Card>
            <CardContent className="flex flex-col gap-2">
                <h2 className="font-bold">configuração fiscal</h2>
                <p className="text-sm text-muted-foreground">
                    integração fiscal (NFC-e) ainda não configurada nesta plataforma.
                    assim que a emissão fiscal for integrada ao backend, documentos, rejeições e erros
                    aparecerão aqui para depuração.
                </p>
            </CardContent>
        </Card>
    )
}

function ErrorsTab() {
    return (
        <Card>
            <CardContent className="flex flex-col gap-2">
                <h2 className="font-bold">erros do sistema para este tenant</h2>
                <p className="text-sm text-muted-foreground">
                    erros 5xx e falhas registradas durante requisições deste tenant aparecerão aqui.
                    <Link to="/admin/monitoring" className="ml-1 underline">ver monitoramento</Link>
                </p>
            </CardContent>
        </Card>
    )
}

type EditForm = {
    name: string
    document: string
    email: string
    phone: string
    isActive: boolean
    planId: string
    subscriptionStatusId: string
    subscriptionExpireDate: string
}

function EditTenantDialog({ open, onOpenChange, tenant, onSave }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    tenant: TenantDetail["tenant"]
    onSave: (settings: Record<string, unknown>) => void
}) {
    const [form, setForm] = useState<EditForm>({
        name: tenant.name,
        document: tenant.document,
        email: tenant.email,
        phone: tenant.phone,
        isActive: tenant.isActive,
        planId: tenant.planId ?? "",
        subscriptionStatusId: tenant.subscriptionStatusId ?? "",
        subscriptionExpireDate: tenant.subscriptionExpireDate ?? "",
    })

    function setField<TField extends keyof EditForm>(key: TField, value: EditForm[TField]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>editar tenant</DialogTitle>
                    <DialogDescription>atualize os dados operacionais de {tenant.name}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="nome" value={form.name} onChange={(v) => setField("name", v)} />
                    <Field label="CNPJ/CPF" value={form.document} onChange={(v) => setField("document", v)} />
                    <Field label="e-mail" value={form.email} onChange={(v) => setField("email", v)} />
                    <Field label="telefone" value={form.phone} onChange={(v) => setField("phone", v)} />
                    <Field label="plano" value={form.planId} onChange={(v) => setField("planId", v)} placeholder="ex: pro" />
                    <Field label="status da assinatura" value={form.subscriptionStatusId} onChange={(v) => setField("subscriptionStatusId", v)} placeholder="ex: active" />
                    <Field label="assinatura expira" value={form.subscriptionExpireDate} onChange={(v) => setField("subscriptionExpireDate", v)} placeholder="ex: 2027-01-01" />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setField("isActive", e.target.checked)}
                            className="size-4 accent-primary"
                        />
                        tenant ativo
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>cancelar</Button>
                    <Button
                        onClick={() => onSave({
                            name: form.name,
                            document: form.document,
                            email: form.email,
                            phone: form.phone,
                            isActive: form.isActive,
                            planId: form.planId || null,
                            subscriptionStatusId: form.subscriptionStatusId || null,
                            subscriptionExpireDate: form.subscriptionExpireDate || null,
                        })}
                    >salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function Field({ label, value, onChange, placeholder }: {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}) {
    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    )
}
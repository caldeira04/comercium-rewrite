import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { LogOutIcon, PlusIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ModeToggle } from "@/components/theme-toggle"
import { Spinner } from "@/components/ui/spinner"
import { loaderCredentials } from "@/utils/auth"
import { getApiUrl } from "@/lib/api-config"
import { getApiErrorMessage } from "@/lib/api-error"
import { useTenant, type TenantSettings } from "@/hooks/use-tenant"
import { useUsers } from "@/hooks/use-users"

export const Route = createFileRoute("/settings/")({
    loader: loaderCredentials,
    component: RouteComponent,
})

const defaultForm = {
    name: "",
    legalName: "",
    document: "",
    email: "",
    phone: "",
    zipcode: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    country: "",
    timezone: "",
    currency: "",
}

function RouteComponent() {
    const { user } = Route.useLoaderData()
    const router = useRouter()

    async function handleLogout() {
        await fetch(getApiUrl("/master/auth/logout"), {
            method: "POST",
            credentials: "include",
        })
        toast.success("sessão encerrada")
        await router.invalidate()
        window.location.href = "/login"
    }

    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <p className="text-muted-foreground">faça login para acessar as configurações</p>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full flex-col gap-4 self-start overflow-y-auto p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">configurações</h1>
                <p className="text-muted-foreground">informações da empresa, usuários e preferências</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex flex-col gap-3">
                        <h2 className="font-bold">preferências</h2>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <span>tema</span>
                            <ModeToggle />
                        </div>
                        <Button variant="destructive" onClick={handleLogout}><LogOutIcon />sair</Button>
                    </CardContent>
                </Card>
                <Card className="col-span-2">
                    <CardContent className="flex flex-col gap-3">
                        <h2 className="font-bold">usuários</h2>
                        <UsersSection />
                    </CardContent>
                </Card>
            </div>
            <CompanyForm tenantId={user.tenantId} tenantSlug={user.tenantSlug} />
        </div>
    )
}

function CompanyForm({ tenantId, tenantSlug }: { tenantId: string, tenantSlug: string }) {
    const { tenant, tenantIsPending, updateTenant, updateTenantIsPending } = useTenant(tenantId)
    const [form, setForm] = useState<typeof defaultForm>(defaultForm)

    useEffect(() => {
        if (!tenant) return

        setForm({
            name: tenant.name ?? "",
            legalName: tenant.legalName ?? "",
            document: tenant.document ?? "",
            email: tenant.email ?? "",
            phone: tenant.phone ?? "",
            zipcode: tenant.zipcode ?? "",
            street: tenant.street ?? "",
            number: tenant.number ?? "",
            district: tenant.district ?? "",
            city: tenant.city ?? "",
            state: tenant.state ?? "",
            country: tenant.country ?? "",
            timezone: tenant.timezone ?? "",
            currency: tenant.currency ?? "",
        })
    }, [tenant])

    function setField(key: keyof typeof defaultForm, value: string) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    async function handleSave() {
        if (!form.name.trim()) {
            toast.error("informe o nome da loja")
            return
        }

        const settings: TenantSettings = {}
        for (const key of Object.keys(defaultForm) as (keyof typeof defaultForm)[]) {
            const value = form[key].trim()
            if (value) settings[key] = value
        }

        try {
            await updateTenant({ tenantId, settings })
            toast.success("informações da loja atualizadas")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao atualizar loja"))
        }
    }

    return (
        <Card>
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold">empresa</h2>
                        <p className="text-muted-foreground">identificador: {tenantSlug}</p>
                    </div>
                    <Button disabled={updateTenantIsPending || tenantIsPending} onClick={handleSave}>
                        {updateTenantIsPending ? "salvando..." : "salvar alterações"}
                    </Button>
                </div>
                {tenantIsPending && <Spinner />}
                {tenant && (
                    <div className="grid grid-cols-3 gap-4">
                        <FormField label="nome" value={form.name} onChange={(value) => setField("name", value)} />
                        <FormField label="razão social" value={form.legalName} onChange={(value) => setField("legalName", value)} />
                        <FormField label="CPF/CNPJ" value={form.document} onChange={(value) => setField("document", value)} />
                        <FormField label="e-mail" value={form.email} onChange={(value) => setField("email", value)} />
                        <FormField label="telefone" value={form.phone} onChange={(value) => setField("phone", value)} />
                        <FormField label="CEP" value={form.zipcode} onChange={(value) => setField("zipcode", value)} />
                        <FormField label="rua" value={form.street} onChange={(value) => setField("street", value)} />
                        <FormField label="número" value={form.number} onChange={(value) => setField("number", value)} />
                        <FormField label="bairro" value={form.district} onChange={(value) => setField("district", value)} />
                        <FormField label="cidade" value={form.city} onChange={(value) => setField("city", value)} />
                        <FormField label="estado" value={form.state} onChange={(value) => setField("state", value)} />
                        <FormField label="país" value={form.country} onChange={(value) => setField("country", value)} />
                        <FormField label="fuso horário" value={form.timezone} onChange={(value) => setField("timezone", value)} />
                        <FormField label="moeda" value={form.currency} onChange={(value) => setField("currency", value)} />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function FormField({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) {
    return (
        <div className="flex flex-col gap-2">
            <Label>{label}</Label>
            <Input value={value} onChange={(event) => onChange(event.target.value)} />
        </div>
    )
}

function UsersSection() {
    const { users, usersIsPending, usersIsError, createUser, createUserIsPending, deleteUser, deleteUserIsPending } = useUsers()
    const [login, setLogin] = useState("")
    const [password, setPassword] = useState("")

    async function handleCreate() {
        if (!login.trim()) {
            toast.error("informe o login do usuário")
            return
        }

        if (password.length < 6) {
            toast.error("a senha deve ter pelo menos 6 caracteres")
            return
        }

        try {
            await createUser({ login: login.trim(), password })
            toast.success("usuário criado com sucesso")
            setLogin("")
            setPassword("")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao criar usuário"))
        }
    }

    async function handleDelete(userId: string) {
        const confirmed = window.confirm("remover este usuário?")
        if (!confirmed) return

        try {
            await deleteUser(userId)
            toast.success("usuário removido")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao remover usuário"))
        }
    }

    if (usersIsPending) return <Spinner />
    if (usersIsError) return <span>ocorreu um erro ao buscar os usuários</span>

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="user-login">login</Label>
                    <Input id="user-login" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="novo@email.com" />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="user-password">senha</Label>
                    <Input id="user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="mínimo 6 caracteres" />
                </div>
            </div>
            <Button disabled={createUserIsPending} onClick={handleCreate}><PlusIcon />adicionar usuário</Button>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>login</TableHead>
                        <TableHead className="text-right">ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(users ?? []).map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>{user.login}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    disabled={deleteUserIsPending}
                                    onClick={() => handleDelete(user.id)}
                                ><TrashIcon /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
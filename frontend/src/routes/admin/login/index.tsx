import { createFileRoute, useNavigate } from "@tanstack/react-router"
import * as z from "zod"
import { useForm } from "@tanstack/react-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getApiUrl } from "@/lib/api-config"
import { getApiErrorMessage, getResponseErrorMessage } from "@/lib/api-error"

const loginSchema = z.object({
    login: z.string().email("Endereço de e-mail inválido"),
    password: z.string().min(1, "Informe a senha"),
})

const bootstrapSchema = z.object({
    name: z.string().min(1, "Informe seu nome"),
    login: z.string().email("Endereço de e-mail inválido"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
})

export const Route = createFileRoute("/admin/login/")({
    component: RouteComponent,
})

function RouteComponent() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: status, isPending: statusPending } = useQuery({
        queryKey: ["admin", "auth", "status"],
        queryFn: async () => {
            const response = await fetch(getApiUrl("/master/admin/auth/status"))
            if (!response.ok) throw new Error("Falha ao verificar o sistema administrativo")
            return response.json() as Promise<{ isSetup: boolean, adminCount: number }>
        },
    })

    if (statusPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">verificando sistema...</p>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4">
            <div className="flex w-full max-w-md flex-col gap-4">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-3xl font-bold uppercase">Comercium</h1>
                    <p className="text-sm uppercase tracking-widest text-muted-foreground">painel administrativo</p>
                </div>
                {status?.isSetup ? <LoginForm onSuccess={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["admin", "auth"] })
                    navigate({ to: "/admin" })
                }} /> : <BootstrapForm onSuccess={async () => {
                    await queryClient.invalidateQueries({ queryKey: ["admin", "auth"] })
                    navigate({ to: "/admin" })
                }} />}
            </div>
        </div>
    )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
    const form = useForm({
        defaultValues: { login: "", password: "" },
        validators: { onSubmit: loginSchema },
        onSubmit: async ({ value }) => {
            try {
                const response = await fetch(getApiUrl("/master/admin/auth/login"), {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(value),
                })

                if (!response.ok) {
                    toast.error(await getResponseErrorMessage(response, "Login falhou"))
                    return
                }

                onSuccess()
            } catch (e) {
                toast.error(getApiErrorMessage(e, "Erro ao realizar login"))
            }
        },
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>acessar painel</CardTitle>
                <CardDescription>somente para a equipe operacional do Comercium</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="admin-login-form"
                    onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
                >
                    <FieldGroup>
                        <form.Field
                            name="login"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>e-mail</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            type="email"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="equipe@comercium.dev"
                                            autoComplete="off"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        />
                        <form.Field
                            name="password"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>senha</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            type="password"
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            autoComplete="off"
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        />
                    </FieldGroup>
                </form>
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
                <Button type="submit" form="admin-login-form">entrar</Button>
            </div>
        </Card>
    )
}

function BootstrapForm({ onSuccess }: { onSuccess: () => void }) {
    const form = useForm({
        defaultValues: { name: "", login: "", password: "" },
        validators: { onSubmit: bootstrapSchema },
        onSubmit: async ({ value }) => {
            try {
                const response = await fetch(getApiUrl("/master/admin/auth/bootstrap"), {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(value),
                })

                if (!response.ok) {
                    toast.error(await getResponseErrorMessage(response, "Falha ao criar o administrador"))
                    return
                }

                toast.success("administrador criado com sucesso")
                onSuccess()
            } catch (e) {
                toast.error(getApiErrorMessage(e, "Erro ao configurar administrador"))
            }
        },
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>primeira configuração</CardTitle>
                <CardDescription>
                    nenhum administrador cadastrado. crie o primeiro usuário (owner) para acessar o painel.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="admin-bootstrap-form"
                    onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
                >
                    <FieldGroup>
                        <form.Field
                            name="name"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>nome</FieldLabel>
                                    <Input
                                        id={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Nome do administrador"
                                        autoComplete="off"
                                    />
                                    {field.state.meta.isTouched && !field.state.meta.isValid && (
                                        <FieldError errors={field.state.meta.errors} />
                                    )}
                                </Field>
                            )}
                        />
                        <form.Field
                            name="login"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>e-mail</FieldLabel>
                                    <Input
                                        id={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="equipe@comercium.dev"
                                        autoComplete="off"
                                    />
                                    {field.state.meta.isTouched && !field.state.meta.isValid && (
                                        <FieldError errors={field.state.meta.errors} />
                                    )}
                                </Field>
                            )}
                        />
                        <form.Field
                            name="password"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>senha</FieldLabel>
                                    <Input
                                        id={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="mínimo 6 caracteres"
                                        autoComplete="off"
                                    />
                                    {field.state.meta.isTouched && !field.state.meta.isValid && (
                                        <FieldError errors={field.state.meta.errors} />
                                    )}
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </form>
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
                <Button type="submit" form="admin-bootstrap-form">criar administrador</Button>
            </div>
        </Card>
    )
}
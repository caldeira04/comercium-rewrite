import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as z from "zod"
import { useForm } from "@tanstack/react-form"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getApiUrl } from '@/lib/api-config'
import { getApiErrorMessage, getResponseErrorMessage } from '@/lib/api-error'

const formSchema = z.object({
    tenantSlug: z
        .string()
        .min(1, "Cód. da loja é obrigatório")
        .max(32, "Cód. da loja deve ter no máximo 32 caracteres"),
    tenantName: z
        .string()
        .min(1, "Nome da loja é obrigatório")
        .max(128, "Nome da loja deve ter no máximo 128 caracteres"),
    tenantDocument: z
        .string()
        .refine((val) => val.length === 11 || val.length === 14, "Tamanho do documento inválido"),
    adminEmail: z
        .email("Endereço de e-mail inválido"),
    adminPhone: z
        .string()
        .min(1, "Telefone é obrigatório"),
    adminPassword: z
        .string()
        .min(6, "Senha deve ter no mínimo 6 caracteres"),
})

export const Route = createFileRoute('/onboarding/')({
    component: RouteComponent,
})

function RouteComponent() {
    const navigate = useNavigate()
    
    // Check if system is already set up
    const { data: setupStatus } = useQuery({
        queryKey: ['onboarding-status'],
        queryFn: async () => {
            const response = await fetch(getApiUrl("/master/onboarding/status"))
            if (!response.ok) throw new Error("Failed to check setup status")
            return response.json()
        }
    })

    // If already set up, redirect to login
    if (setupStatus?.isSetup) {
        setTimeout(() => {
            navigate({ to: '/login' })
        }, 0)
        return null
    }

    const form = useForm({
        defaultValues: {
            tenantSlug: "",
            tenantName: "",
            tenantDocument: "",
            adminEmail: "",
            adminPhone: "",
            adminPassword: "",
        },
        validators: {
            onSubmit: formSchema
        },
        onSubmit: async ({ value }) => {
            try {
                const response = await fetch(getApiUrl("/master/onboarding/setup"), {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(value)
                })

                if (!response.ok) {
                    toast.error(await getResponseErrorMessage(response, "Configuração inicial falhou"))
                    return
                }

                toast.success("Loja configurada com sucesso!")
                navigate({ to: "/" })
            } catch (e) {
                toast.error(getApiErrorMessage(e, "Erro ao configurar loja"))
            }
        }
    })

    return (
        <Card className='min-w-2/4'>
            <CardHeader>
                <CardTitle>
                    <h1>Configurar Comercium</h1>
                </CardTitle>
                <CardDescription>
                    Preencha as informações abaixo para começar a usar seu Comercium
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="onboarding-form"
                    onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        <div>
                            <h2 className="font-semibold mb-4 mt-4">Informações da Loja</h2>
                        </div>

                        <form.Field
                            name="tenantSlug"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>Cód. da Loja</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Ex: loja001"
                                    />
                                    <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                </Field>
                            )}
                        />

                        <form.Field
                            name="tenantName"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>Nome da Loja</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Ex: Minha Loja LTDA"
                                    />
                                    <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                </Field>
                            )}
                        />

                        <form.Field
                            name="tenantDocument"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>CNPJ ou CPF</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Ex: 12345678901234"
                                    />
                                    <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                </Field>
                            )}
                        />

                        <div>
                            <h2 className="font-semibold mb-4 mt-6">Dados do Administrador</h2>
                        </div>

                        <form.Field
                            name="adminEmail"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Ex: admin@loja.com"
                                    />
                                    <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                </Field>
                            )}
                        />

                        <form.Field
                            name="adminPhone"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>Telefone</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Ex: 11999999999"
                                    />
                                    <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                </Field>
                            )}
                        />

                        <form.Field
                            name="adminPassword"
                            children={(field) => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Crie uma senha segura"
                                    />
                                    <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                </Field>
                            )}
                        />
                    </FieldGroup>
                </form>
            </CardContent>
            <div className='flex gap-4 justify-end p-6 pt-0'>
                <Button
                    form="onboarding-form"
                    type='submit'
                >
                    Configurar e Começar
                </Button>
            </div>
        </Card>
    )
}

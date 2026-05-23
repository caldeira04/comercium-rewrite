import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as z from "zod"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const formSchema = z.object({
    tenantSlug: z
        .string()
        .min(1, "Cód. da loja é obrigatório")
        .max(32, "Cód. da loja deve ter no máximo 32 caracteres"),
    document: z
        .string()
        .refine((val) => val.length === 11 || val.length === 14, "Tamanho do documento inválido"),
    email: z
        .email("Endereço de e-mail inválido"),
    name: z
        .string()
        .min(1, "Nome da loja é obrigatório")
        .max(128, "Nome da loja deve ter no máximo 128 caracteres"),
    phone: z
        .string()
        .min(1, "Telefone é obrigatório")
        .max(11, "Formato do telefone inválido"),
    password: z
        .string()
        .min(1, "Senha é obrigatória")
})

export const Route = createFileRoute('/register/')({
    component: RouteComponent,
})

function RouteComponent() {

    const navigate = useNavigate()

    const form = useForm({
        defaultValues: {
            name: "",
            phone: "",
            document: "",
            tenantSlug: "",
            email: "",
            password: ""
        },
        validators: {
            onSubmit: formSchema
        },
        onSubmit: async ({ value }) => {
            try {
                const response = await fetch("http://localhost:3000/master/auth/signup", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(value)
                })

                if (!response.ok) {
                    const error = await response.json()
                    toast.error(error.message || "Registro de loja falhou")
                    return
                }

                toast.success("registro de loja realizado com sucesso")
                navigate({ to: "/" })
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro ao realizar registro de loja")
            }
        }
    })

    return (
        <Card className='min-w-2/4'>
            <CardHeader>
                <CardTitle>
                    <h1>registrar nova loja</h1>
                </CardTitle>
                <CardDescription>
                    já tem loja? <Link to='/login'>faça seu login</Link>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="register-form"
                    onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                    }}
                >
                    <FieldGroup>

                        <form.Field
                            name="name"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Nome da loja</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Loja de conveniência S/A"
                                            autoComplete='off'
                                        />
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}
                        />

                        <form.Field
                            name="tenantSlug"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Cód. da loja</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Loja de conveniência S/A"
                                            autoComplete='off'
                                        />
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}
                        />

                        <form.Field
                            name="phone"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Telefone da loja</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Loja de conveniência S/A"
                                            autoComplete='off'
                                        />
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}
                        />

                        <form.Field
                            name="document"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>CPF/CNPJ da loja</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="Loja de conveniência S/A"
                                            autoComplete='off'
                                        />
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}
                        />

                        <form.Field
                            name="email"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            placeholder="emaildaloja@email.com"
                                            autoComplete='off'
                                        />
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
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
                                        <FieldLabel htmlFor={field.name}>Senha</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            aria-invalid={isInvalid}
                                            type='password'
                                            placeholder="senha"
                                            autoComplete='off'
                                        />
                                        {isInvalid && (
                                            <FieldError errors={field.state.meta.errors} />
                                        )}
                                    </Field>
                                )
                            }}
                        />

                    </FieldGroup>
                </form>
            </CardContent>
            <CardFooter className="flex w-full justify-end">
                <Button type="submit" form="register-form">realizar cadastro</Button>
            </CardFooter>
        </Card>
    )
}


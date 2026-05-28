import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import * as z from "zod"
import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getApiUrl } from '@/lib/api-config'

const formSchema = z.object({
    login: z
        .email("Endereço de e-mail inválido"),
    password: z
        .string()
})

export const Route = createFileRoute('/login/')({
    component: RouteComponent,
})

function RouteComponent() {

    const navigate = useNavigate()

    const form = useForm({
        defaultValues: {
            login: "",
            password: ""
        },
        validators: {
            onSubmit: formSchema
        },
        onSubmit: async ({ value }) => {
            try {
                const response = await fetch(getApiUrl("/master/auth/login"), {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(value)
                })

                if (!response.ok) {
                    const error = await response.json()
                    toast.error(error.message || "Login falhou")
                    return
                }

                toast.success("login realizado com sucesso")
                navigate({ to: "/" })
            } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro ao realizar login")
            }
        }
    })

    return (
        <Card className='min-w-2/4'>
            <CardHeader>
                <CardTitle>
                    <h1>realizar login</h1>
                </CardTitle>
                <CardDescription>
                    não tem loja? <Link
                        to='/register'
                        className='hover:underline text-main'
                    >faça seu cadastro</Link>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="login-form"
                    onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        <form.Field
                            name="login"
                            children={(field) => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>Login</FieldLabel>
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
                <Button type="submit" form="login-form">realizar login</Button>
            </CardFooter>
        </Card>
    )
}

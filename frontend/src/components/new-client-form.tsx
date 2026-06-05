import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useForm } from "@tanstack/react-form"
import * as z from "zod"
import { toast } from "sonner"
import { useClients } from "@/hooks/use-clients"
import { getApiErrorMessage } from "@/lib/api-error"

const formSchema = z.object({
    name: z
        .string()
        .min(1, "Nome do cliente é obrigatório")
        .max(128, "Nome do cliente deve ter no máximo 128 caracteres"),
    document: z
        .string()
        .refine(
            (val) => val.length === 0 || val.length === 11 || val.length === 14,
            "Tamanho do documento inválido"
        ),
    email: z.union([z.email("Endereço de e-mail inválido"), z.literal("")]),
    phone: z
        .string()
        .max(11, "Formato do telefone inválido"),
})

interface FormProps {
    onClose?: () => void
    client?: any | null
}

export default function NewClientForm({ onClose, client }: FormProps) {
    const { editClient, createClient } = useClients()

    const form = useForm({
        defaultValues: {
            name: client ? client.name : "",
            document: client ? client.document ?? "" : "",
            email: client ? client.email ?? "" : "",
            phone: client ? client.phone ?? "" : "",
        },
        validators: {
            onSubmit: formSchema,
        },
        onSubmit: async ({ value }) => {
            try {
                if (!client) {

                    await createClient({
                        name: value.name,
                        document: value.document || undefined,
                        email: value.email || undefined,
                        phone: value.phone || undefined,
                    })

                    toast.success("cliente cadastrado com sucesso")
                    form.reset()
                    onClose ? onClose() : null
                } else {

                    await editClient({
                        client: {
                            name: value.name,
                            document: value.document || undefined,
                            email: value.email || undefined,
                            phone: value.phone || undefined,
                        },
                        clientId: client.id
                    })

                    toast.success("dados alterados com sucesso")
                }

            } catch (e) {
                toast.error(getApiErrorMessage(e, "Erro ao cadastrar cliente"))
            }
        },
    })


    return (

        <form
            id="new-client-form"
            onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
            }}
        >
            <FieldGroup>
                <form.Field
                    name="name"
                    children={(field) => {
                        const isInvalid =
                            field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>Nome do cliente</FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    aria-invalid={isInvalid}
                                    placeholder="Maria da Silva"
                                    autoComplete="off"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        )
                    }}
                />

                <form.Field
                    name="document"
                    children={(field) => {
                        const isInvalid =
                            field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>CPF/CNPJ</FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    aria-invalid={isInvalid}
                                    placeholder="00000000000"
                                    autoComplete="off"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        )
                    }}
                />

                <form.Field
                    name="email"
                    children={(field) => {
                        const isInvalid =
                            field.state.meta.isTouched && !field.state.meta.isValid
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
                                    placeholder="cliente@email.com"
                                    autoComplete="off"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        )
                    }}
                />

                <form.Field
                    name="phone"
                    children={(field) => {
                        const isInvalid =
                            field.state.meta.isTouched && !field.state.meta.isValid
                        return (
                            <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>Telefone</FieldLabel>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    aria-invalid={isInvalid}
                                    placeholder="11999999999"
                                    autoComplete="off"
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        )
                    }}
                />
            </FieldGroup>
        </form>
    )
}

import { useState, type FormEvent, type KeyboardEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"
import { BotIcon, DatabaseIcon, MessageSquareIcon, PlusIcon, SendIcon, SparklesIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useAssistant, type AssistantSource, type AssistantToolUsage } from "@/hooks/use-assistant"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/assistant/")({
    component: AssistantPage,
})

type AssistantMessage = {
    role: "user" | "assistant"
    content: string
    toolsUsed?: AssistantToolUsage[]
    sources?: AssistantSource[]
    isError?: boolean
}

function AssistantMarkdown({ content }: { content: string }) {
    return (
        <ReactMarkdown
            components={{
                h1: ({ children }) => <h1 className="text-lg font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
                p: ({ children }) => <p className="leading-6">{children}</p>,
                ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground">
                        {children}
                    </blockquote>
                ),
                pre: ({ children }) => (
                    <pre className="overflow-x-auto rounded-md bg-background/70 p-3 text-xs">
                        {children}
                    </pre>
                ),
                code: ({ className, children, ...props }) => (
                    <code
                        className={className
                            ? "font-mono"
                            : "rounded bg-background/70 px-1 py-0.5 font-mono text-xs"}
                        {...props}
                    >
                        {children}
                    </code>
                ),
                a: ({ href, children }) => href
                    ? <a className="text-primary underline underline-offset-4" href={href} target="_blank" rel="noreferrer">{children}</a>
                    : <>{children}</>,
                table: ({ children }) => (
                    <div className="max-w-full overflow-x-auto">
                        <table className="w-full border-collapse text-left">{children}</table>
                    </div>
                ),
                th: ({ children }) => <th className="border-b px-2 py-1 font-semibold">{children}</th>,
                td: ({ children }) => <td className="border-b px-2 py-1">{children}</td>,
                hr: () => <hr className="border-border" />,
            }}
        >
            {content}
        </ReactMarkdown>
    )
}

const suggestions = [
    "Quanto vendi esse mês?",
    "Quais contas vencem nos próximos 7 dias?",
    "Quais produtos estão com estoque baixo?",
    "O que está parado no estoque há mais de 30 dias?",
    "Como faço para cancelar uma venda?",
]

function AssistantPage() {
    const { conversations, isLoadingConversations, fetchConversation, sendMessage, deleteConversation } = useAssistant()
    const [conversationId, setConversationId] = useState<string>()
    const [messages, setMessages] = useState<AssistantMessage[]>([])
    const [draft, setDraft] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    async function askAssistant(question: string) {
        const message = question.trim()
        if (!message || isLoading) return

        setDraft("")
        setIsLoading(true)
        setMessages((current) => [...current, { role: "user", content: message }])

        try {
            const data = await sendMessage({ message, conversationId })

            setConversationId(data.conversationId)
            setMessages((current) => [...current, {
                role: "assistant",
                content: data.response,
                toolsUsed: data.toolsUsed,
                sources: data.sources,
            }])
        } catch (error) {
            setMessages((current) => [...current, {
                role: "assistant",
                content: getApiErrorMessage(error, "Não foi possível responder agora."),
                isError: true,
            }])
        } finally {
            setIsLoading(false)
        }
    }

    async function openConversation(id: string) {
        if (isLoading || id === conversationId) return

        setIsLoading(true)
        try {
            const conversation = await fetchConversation(id)
            setConversationId(conversation.id)
            setMessages(conversation.messages)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "não foi possível abrir a conversa"))
        } finally {
            setIsLoading(false)
        }
    }

    function startNewConversation() {
        setConversationId(undefined)
        setMessages([])
        setDraft("")
    }

    async function removeConversation(id: string) {
        if (!window.confirm("excluir esta conversa?")) return

        try {
            await deleteConversation(id)
            if (id === conversationId) startNewConversation()
        } catch (error) {
            toast.error(getApiErrorMessage(error, "não foi possível excluir a conversa"))
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        void askAssistant(draft)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            void askAssistant(draft)
        }
    }

    return (
        <main className="flex min-h-screen w-full gap-4 p-4">
            <Card className="hidden w-64 shrink-0 flex-col md:flex">
                <CardHeader className="border-b">
                    <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={startNewConversation}>
                        <PlusIcon />
                        Nova conversa
                    </Button>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-1 overflow-y-auto pt-2">
                    {isLoadingConversations ? (
                        <p className="px-2 text-xs text-muted-foreground">Carregando…</p>
                    ) : conversations.length === 0 ? (
                        <p className="px-2 text-xs text-muted-foreground">Suas conversas aparecem aqui.</p>
                    ) : (
                        conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={cn(
                                    "group flex items-center gap-1 rounded-md text-sm hover:bg-muted",
                                    conversation.id === conversationId && "bg-muted"
                                )}
                            >
                                <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                                    disabled={isLoading}
                                    onClick={() => void openConversation(conversation.id)}
                                    title={conversation.title}
                                >
                                    <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{conversation.title}</span>
                                </button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                                    aria-label={`Excluir conversa ${conversation.title}`}
                                    onClick={() => void removeConversation(conversation.id)}
                                >
                                    <Trash2Icon />
                                </Button>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                <BotIcon className="size-6" />
                            </div>
                            <div>
                                <CardTitle>Assistente Comercium</CardTitle>
                                <CardDescription>
                                    Pergunte sobre suas vendas, estoque, contas e caixa, ou tire dúvidas de uso.
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="md:hidden"
                            disabled={messages.length === 0 || isLoading}
                            onClick={startNewConversation}
                        >
                            <PlusIcon />
                            Nova
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-4">
                    <section
                        aria-live="polite"
                        className="flex min-h-80 flex-1 flex-col gap-4 overflow-y-auto"
                    >
                        {messages.length === 0 && !isLoading ? (
                            <div className="m-auto flex max-w-xl flex-col items-center gap-4 py-8 text-center">
                                <SparklesIcon className="size-8 text-primary" />
                                <div>
                                    <h2 className="text-lg font-semibold">Como posso ajudar?</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Eu consulto os dados da sua loja para responder. Por enquanto só leio informações; não altero nada.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {suggestions.map((suggestion) => (
                                        <Button
                                            key={suggestion}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void askAssistant(suggestion)}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <article
                                    key={`${message.role}-${index}`}
                                    className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                                            message.role === "user" && "whitespace-pre-wrap bg-primary text-primary-foreground",
                                            message.role === "assistant" && !message.isError && "bg-muted",
                                            message.isError && "border border-destructive/40 bg-destructive/10 text-destructive"
                                        )}
                                    >
                                        {message.role === "assistant"
                                            ? <div className="space-y-2"><AssistantMarkdown content={message.content} /></div>
                                            : message.content}
                                    </div>
                                    {((message.toolsUsed?.length ?? 0) > 0 || (message.sources?.length ?? 0) > 0) && (
                                        <div className="flex max-w-[85%] flex-wrap gap-2">
                                            {message.toolsUsed
                                                ?.filter((tool) => tool.name !== "buscar_ajuda")
                                                .map((tool) => (
                                                    <span
                                                        key={tool.name}
                                                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
                                                    >
                                                        <DatabaseIcon className="size-3" />
                                                        Consultou: {tool.label}
                                                    </span>
                                                ))}
                                            {message.sources?.map((source) => (
                                                <span
                                                    key={source.sourceFile}
                                                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
                                                    title={source.sourceFile}
                                                >
                                                    Fonte: {source.title}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            ))
                        )}
                        {isLoading && (
                            <p className="text-sm text-muted-foreground" role="status">
                                Consultando os dados da loja…
                            </p>
                        )}
                    </section>

                    <form className="flex items-end gap-2 border-t pt-4" onSubmit={handleSubmit}>
                        <Textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Pergunte algo sobre a sua loja..."
                            maxLength={2000}
                            rows={2}
                            disabled={isLoading}
                            aria-label="Sua pergunta"
                        />
                        <Button type="submit" disabled={isLoading || !draft.trim()} aria-label="Enviar pergunta">
                            <SendIcon />
                        </Button>
                    </form>
                    <p className="text-center text-xs text-muted-foreground">
                        As perguntas e os dados consultados são enviados ao provedor de IA configurado, e as conversas ficam salvas no Comercium.
                        O assistente pode cometer erros; confira informações importantes no sistema.
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}

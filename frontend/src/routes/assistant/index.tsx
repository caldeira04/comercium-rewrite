import { useState, type FormEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import ReactMarkdown from "react-markdown"
import { BotIcon, RotateCcwIcon, SendIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getApiUrl } from "@/lib/api-config"

export const Route = createFileRoute("/assistant/")({
    component: AssistantPage,
})

type AssistantSource = {
    title: string
    sourceFile: string
}

type AssistantMessage = {
    role: "user" | "assistant"
    content: string
    sources?: AssistantSource[]
}

type AssistantResponse = {
    response?: string
    sources?: AssistantSource[]
    message?: string
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
    "Como faço para cancelar uma venda?",
    "Como registro uma movimentação de estoque?",
    "Onde encontro os relatórios de vendas?",
]

function AssistantPage() {
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
            const response = await fetch(getApiUrl("/tenant/assistant/chat"), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            })
            const data = await response.json() as AssistantResponse

            if (!response.ok) {
                throw new Error(data.message ?? "Não foi possível responder agora.")
            }

            setMessages((current) => [...current, {
                role: "assistant",
                content: data.response ?? "Não consegui gerar uma resposta.",
                sources: data.sources ?? [],
            }])
        } catch (error) {
            setMessages((current) => [...current, {
                role: "assistant",
                content: error instanceof Error ? error.message : "Não foi possível responder agora.",
            }])
        } finally {
            setIsLoading(false)
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        void askAssistant(draft)
    }

    return (
        <main className="flex min-h-screen w-full flex-col gap-4 p-4">
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
                                    Tire dúvidas sobre como usar o sistema.
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={messages.length === 0 || isLoading}
                            onClick={() => setMessages([])}
                        >
                            <RotateCcwIcon />
                            Nova conversa
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-4">
                    <section
                        aria-live="polite"
                        className="flex min-h-80 flex-1 flex-col gap-4 overflow-y-auto"
                    >
                        {messages.length === 0 ? (
                            <div className="m-auto flex max-w-xl flex-col items-center gap-4 py-8 text-center">
                                <SparklesIcon className="size-8 text-primary" />
                                <div>
                                    <h2 className="text-lg font-semibold">Como posso ajudar?</h2>
                                    <p className="text-sm text-muted-foreground">
                                        As respostas são baseadas nos guias de uso do Comercium.
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
                                    <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${message.role === "user" ? "whitespace-pre-wrap bg-primary text-primary-foreground" : "bg-muted"}`}>
                                        {message.role === "assistant"
                                            ? <div className="space-y-2"><AssistantMarkdown content={message.content} /></div>
                                            : message.content}
                                    </div>
                                    {message.sources && message.sources.length > 0 && (
                                        <div className="flex max-w-[85%] flex-wrap gap-2">
                                            {message.sources.map((source) => (
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
                                Consultando os guias do Comercium…
                            </p>
                        )}
                    </section>

                    <form className="flex items-end gap-2 border-t pt-4" onSubmit={handleSubmit}>
                        <Textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            placeholder="Escreva sua dúvida..."
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
                        As perguntas são processadas pelo provedor de IA configurado e não são salvas no histórico do Comercium.
                        O assistente pode cometer erros; confira informações importantes no sistema.
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}

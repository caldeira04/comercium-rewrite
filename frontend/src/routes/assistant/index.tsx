import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import ReactMarkdown from "react-markdown"
import { toast } from "sonner"
import {
    BotIcon,
    DatabaseIcon,
    FileTextIcon,
    HistoryIcon,
    MessageSquareIcon,
    PaperclipIcon,
    PlusIcon,
    SendIcon,
    SparklesIcon,
    Trash2Icon,
    XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ActionCard } from "@/components/assistant/action-card"
import { ReportDownload } from "@/components/assistant/report-download"
import {
    useAssistant,
    type AssistantAction,
    type AssistantAttachment,
    type AssistantDownload,
    type AssistantSource,
    type AssistantToolUsage,
} from "@/hooks/use-assistant"
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
    actions?: AssistantAction[]
    downloads?: AssistantDownload[]
    attachments?: AssistantAttachment[]
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
    "O que preciso recomprar essa semana?",
    "Quais clientes sumiram?",
    "Me manda o PDF das contas pagas do mês passado",
    "Lança a conta de luz de R$ 320 para dia 10",
    "Como faço para cancelar uma venda?",
]

function AssistantPage() {
    const {
        conversations,
        isLoadingConversations,
        fetchConversation,
        sendMessage,
        deleteConversation,
        confirmAction,
        rejectAction,
        uploadAttachment,
        isUploadingAttachment,
    } = useAssistant()
    const [attachment, setAttachment] = useState<AssistantAttachment>()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [conversationId, setConversationId] = useState<string>()
    const [messages, setMessages] = useState<AssistantMessage[]>([])
    const [draft, setDraft] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const messagesRef = useRef<HTMLElement>(null)

    // Mantém a última mensagem visível; no celular a área de chat é pequena
    useEffect(() => {
        const element = messagesRef.current
        if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" })
    }, [messages, isLoading])

    async function askAssistant(question: string) {
        const pendingAttachment = attachment
        const message = question.trim() || (pendingAttachment ? "Importe esta nota fiscal." : "")
        if (!message || isLoading || isUploadingAttachment) return

        setDraft("")
        setAttachment(undefined)
        setIsLoading(true)
        // Uma nova mensagem expira no servidor os cartões ainda pendentes
        setMessages((current) => [
            ...current.map((item) => item.actions?.some((action) => action.status === "proposed")
                ? { ...item, actions: item.actions.map((action) => action.status === "proposed" ? { ...action, status: "expired" as const } : action) }
                : item),
            { role: "user", content: message, attachments: pendingAttachment ? [pendingAttachment] : [] },
        ])

        try {
            const data = await sendMessage({ message, conversationId, attachmentId: pendingAttachment?.id })

            setConversationId(data.conversationId)
            setMessages((current) => [...current, {
                role: "assistant",
                content: data.response,
                toolsUsed: data.toolsUsed,
                sources: data.sources,
                actions: data.actions,
                downloads: data.downloads,
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
        setIsHistoryOpen(false)
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

    function replaceAction(updated: AssistantAction) {
        setMessages((current) => current.map((message) => message.actions?.some((action) => action.id === updated.id)
            ? { ...message, actions: message.actions.map((action) => action.id === updated.id ? updated : action) }
            : message))
        return updated
    }

    async function handleConfirmAction(actionId: string, values: AssistantAction["values"]) {
        return replaceAction(await confirmAction({ actionId, values }))
    }

    async function handleRejectAction(actionId: string) {
        return replaceAction(await rejectAction(actionId))
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (!file) return

        try {
            const uploaded = await uploadAttachment(file)
            setAttachment({ id: uploaded.id, fileName: uploaded.fileName })
        } catch (error) {
            toast.error(getApiErrorMessage(error, "não foi possível enviar o arquivo"))
        }
    }

    function startNewConversation() {
        setIsHistoryOpen(false)
        setConversationId(undefined)
        setMessages([])
        setDraft("")
        setAttachment(undefined)
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
        // Em telas de toque o Enter quebra a linha; o envio fica no botão
        const isTouch = window.matchMedia("(pointer: coarse)").matches
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !isTouch) {
            event.preventDefault()
            void askAssistant(draft)
        }
    }

    const conversationList = (
        <>
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
                            className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-left md:py-1.5"
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
                            className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label={`Excluir conversa ${conversation.title}`}
                            onClick={() => void removeConversation(conversation.id)}
                        >
                            <Trash2Icon />
                        </Button>
                    </div>
                ))
            )}
        </>
    )

    return (
        <main className="flex h-[calc(100dvh-3rem)] w-full gap-4 md:h-dvh md:p-4">
            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <SheetContent side="left" className="w-[85%] gap-2 p-3 pt-12">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Conversas</SheetTitle>
                        <SheetDescription>Histórico de conversas com o assistente</SheetDescription>
                    </SheetHeader>
                    <Button type="button" variant="outline" disabled={isLoading} onClick={startNewConversation}>
                        <PlusIcon />
                        Nova conversa
                    </Button>
                    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                        {conversationList}
                    </div>
                </SheetContent>
            </Sheet>

            <Card className="hidden w-64 shrink-0 flex-col md:flex">
                <CardHeader className="border-b">
                    <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={startNewConversation}>
                        <PlusIcon />
                        Nova conversa
                    </Button>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-1 overflow-y-auto pt-2">
                    {conversationList}
                </CardContent>
            </Card>

            <Card className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-0 rounded-none border-0 py-0 md:gap-4 md:rounded-xl md:border md:py-5">
                <CardHeader className="border-b px-3 py-2 md:px-5 md:py-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="hidden rounded-lg bg-primary/10 p-2 text-primary sm:block">
                                <BotIcon className="size-6" />
                            </div>
                            <div>
                                <CardTitle>Assistente Comercium</CardTitle>
                                <CardDescription className="hidden sm:block">
                                    Pergunte sobre vendas, estoque, contas e caixa, peça lançamentos ou tire dúvidas de uso.
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-2 md:hidden">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Conversas anteriores"
                                onClick={() => setIsHistoryOpen(true)}
                            >
                                <HistoryIcon />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="Nova conversa"
                                disabled={messages.length === 0 || isLoading}
                                onClick={startNewConversation}
                            >
                                <PlusIcon />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:gap-4 md:px-5 md:pt-4 md:pb-0">
                    <section
                        ref={messagesRef}
                        aria-live="polite"
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
                    >
                        {messages.length === 0 && !isLoading ? (
                            <div className="m-auto flex max-w-xl flex-col items-center gap-4 py-4 text-center md:py-8">
                                <SparklesIcon className="size-8 text-primary" />
                                <div>
                                    <h2 className="text-lg font-semibold">Como posso ajudar?</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Eu consulto os dados da sua loja para responder. Também preparo lançamentos de contas, baixas e cadastros de clientes e produtos, mas nada é gravado sem a sua confirmação.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {suggestions.map((suggestion) => (
                                        <Button
                                            key={suggestion}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-auto max-w-full py-1.5 whitespace-normal"
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
                                            "max-w-[92%] min-w-0 rounded-xl px-3 py-2.5 text-sm wrap-break-word md:max-w-[85%] md:px-4 md:py-3",
                                            message.role === "user" && "whitespace-pre-wrap bg-primary text-primary-foreground",
                                            message.role === "assistant" && !message.isError && "bg-muted",
                                            message.isError && "border border-destructive/40 bg-destructive/10 text-destructive"
                                        )}
                                    >
                                        {message.role === "assistant"
                                            ? <div className="space-y-2"><AssistantMarkdown content={message.content} /></div>
                                            : message.content}
                                    </div>
                                    {message.attachments?.map((item) => (
                                        <span
                                            key={item.id}
                                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
                                        >
                                            <FileTextIcon className="size-3" />
                                            {item.fileName}
                                        </span>
                                    ))}
                                    {(message.downloads?.length ?? 0) > 0 && (
                                        <div className="flex max-w-[92%] flex-wrap gap-2 md:max-w-[85%]">
                                            {message.downloads?.map((download) => (
                                                <ReportDownload key={download.title} download={download} />
                                            ))}
                                        </div>
                                    )}
                                    {message.actions?.map((action) => (
                                        <ActionCard
                                            key={action.id}
                                            action={action}
                                            onConfirm={(values) => handleConfirmAction(action.id, values)}
                                            onReject={() => handleRejectAction(action.id)}
                                        />
                                    ))}
                                    {((message.toolsUsed?.length ?? 0) > 0 || (message.sources?.length ?? 0) > 0) && (
                                        <div className="flex max-w-[92%] flex-wrap gap-2 md:max-w-[85%]">
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

                    {attachment && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1">
                                <FileTextIcon className="size-3" />
                                {attachment.fileName}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Remover anexo"
                                onClick={() => setAttachment(undefined)}
                            >
                                <XIcon />
                            </Button>
                        </div>
                    )}
                    <form className="flex items-end gap-2 border-t pt-4" onSubmit={handleSubmit}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xml,text/xml,application/xml"
                            className="hidden"
                            onChange={(event) => void handleFileChange(event)}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isLoading || isUploadingAttachment}
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Anexar XML de NF-e"
                            title="Anexar XML de NF-e"
                        >
                            <PaperclipIcon />
                        </Button>
                        <Textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Pergunte algo sobre a sua loja..."
                            maxLength={2000}
                            rows={2}
                            enterKeyHint="enter"
                            className="max-h-40 min-h-11 md:min-h-16"
                            disabled={isLoading}
                            aria-label="Sua pergunta"
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || isUploadingAttachment || (!draft.trim() && !attachment)}
                            aria-label="Enviar pergunta"
                        >
                            <SendIcon />
                        </Button>
                    </form>
                    <p className="hidden text-center text-xs text-muted-foreground md:block">
                        As perguntas e os dados consultados são enviados ao provedor de IA configurado, e as conversas ficam salvas no Comercium.
                        O assistente pode cometer erros; confira informações importantes no sistema.
                    </p>
                </CardContent>
            </Card>
        </main>
    )
}

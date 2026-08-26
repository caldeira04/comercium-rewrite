import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { useAdminAnnouncements } from "@/hooks/use-admin"
import { getApiErrorMessage } from "@/lib/api-error"
import { formatTime } from "@/utils/time"

export const Route = createFileRoute("/admin/announcements/")({
    component: RouteComponent,
})

function RouteComponent() {
    const announcements = useAdminAnnouncements()
    const [showCreate, setShowCreate] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    async function handleToggle(id: string, isActive: boolean) {
        try {
            await announcements.updateAnnouncement({ announcementId: id, input: { isActive: !isActive } })
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao atualizar comunicado"))
        }
    }

    async function handleDelete() {
        if (!deleting) return
        try {
            await announcements.deleteAnnouncement(deleting)
            toast.success("comunicado removido")
            setDeleting(null)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao remover comunicado"))
        }
    }

    const target = announcements.data?.find((a) => a.id === deleting)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">comunicados</h1>
                    <p className="text-muted-foreground">anúncios globais e avisos por tenant</p>
                </div>
                <Button onClick={() => setShowCreate(true)}><PlusIcon /> novo comunicado</Button>
            </div>

            <Card>
                <CardContent className="text-sm text-muted-foreground">
                    o backend de entrega de comunicados aos usuários ainda não está implementado; este painel
                    gerencia os anúncios que serão exibidos quando a entrega for integrada.
                </CardContent>
            </Card>

            {announcements.isPending && <Spinner />}
            {announcements.isError && <p className="text-muted-foreground">ocorreu um erro ao buscar os comunicados</p>}

            {announcements.data && announcements.data.length === 0 && (
                <Card>
                    <CardContent className="text-center text-muted-foreground">nenhum comunicado cadastrado</CardContent>
                </Card>
            )}

            {announcements.data && announcements.data.length > 0 && (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>título</TableHead>
                            <TableHead>escopo</TableHead>
                            <TableHead>status</TableHead>
                            <TableHead>criado</TableHead>
                            <TableHead className="text-right">ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {announcements.data.map((announcement) => (
                            <TableRow key={announcement.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{announcement.title}</span>
                                        <span className="max-w-72 truncate text-xs text-muted-foreground">{announcement.body}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {announcement.scope === "global" ? "global" : `tenant ${announcement.tenantId?.slice(0, 8) ?? ""}`}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <button
                                        className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${announcement.isActive ? "justify-end bg-primary" : "justify-start bg-muted"}`}
                                        onClick={() => handleToggle(announcement.id, announcement.isActive)}
                                        aria-label={`alternar ${announcement.title}`}
                                    >
                                        <span className="size-4 rounded-full bg-white shadow" />
                                    </button>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{formatTime(new Date(announcement.createdAt)).ddMMyy}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(announcement.id)}>
                                        <TrashIcon />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {showCreate && <CreateAnnouncementForm onClose={() => setShowCreate(false)} onCreate={announcements.createAnnouncement} />}

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(open) => { if (!open) setDeleting(null) }}
                title="remover comunicado"
                description={`remover o comunicado "${target?.title}"?`}
                confirmLabel="remover"
                requireText={target?.title ?? ""}
                isPending={announcements.deleteAnnouncementIsPending}
                onConfirm={handleDelete}
            />
        </div>
    )
}

function CreateAnnouncementForm({ onClose, onCreate }: {
    onClose: () => void
    onCreate: (input: { title: string, body: string, scope: "global" | "tenant", isActive?: boolean }) => Promise<unknown>
}) {
    const [title, setTitle] = useState("")
    const [body, setBody] = useState("")
    const [scope, setScope] = useState<"global" | "tenant">("global")

    async function handleCreate() {
        if (!title.trim() || !body.trim()) {
            toast.error("preencha título e mensagem")
            return
        }
        try {
            await onCreate({ title: title.trim(), body: body.trim(), scope })
            toast.success("comunicado criado")
            onClose()
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao criar comunicado"))
        }
    }

    return (
        <Card>
            <CardContent className="flex flex-col gap-3">
                <h2 className="font-bold">novo comunicado</h2>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <Label>título</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: manutenção programada" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>escopo</Label>
                        <Select value={scope} onValueChange={(v) => setScope(v as "global" | "tenant")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">global</SelectItem>
                                <SelectItem value="tenant">por tenant</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <Label>mensagem</Label>
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="mensagem exibida aos usuários..." rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>cancelar</Button>
                    <Button onClick={handleCreate}>criar</Button>
                </div>
            </CardContent>
        </Card>
    )
}
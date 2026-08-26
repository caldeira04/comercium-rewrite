import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useAdminFlags } from "@/hooks/use-admin"
import { getApiErrorMessage } from "@/lib/api-error"

export const Route = createFileRoute("/admin/flags/")({
    component: RouteComponent,
})

function RouteComponent() {
    const flags = useAdminFlags()
    const [showCreate, setShowCreate] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    async function handleToggle(flagId: string, enabled: boolean) {
        try {
            await flags.updateFlag({ flagId, input: { enabled: !enabled } })
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao atualizar flag"))
        }
    }

    async function handleDelete() {
        if (!deleting) return
        try {
            await flags.deleteFlag(deleting)
            toast.success("flag removida")
            setDeleting(null)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao remover flag"))
        }
    }

    const target = flags.data?.find((f) => f.id === deleting)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold uppercase">feature flags</h1>
                    <p className="text-muted-foreground">habilite ou desabilite recursos sem fazer deploy</p>
                </div>
                <Button onClick={() => setShowCreate(true)}><PlusIcon /> nova flag</Button>
            </div>

            {flags.isPending && <Spinner />}
            {flags.isError && <p className="text-muted-foreground">ocorreu um erro ao buscar as flags</p>}

            {flags.data && flags.data.length === 0 && (
                <Card>
                    <CardContent className="text-center text-muted-foreground">nenhuma feature flag cadastrada</CardContent>
                </Card>
            )}

            {flags.data && flags.data.length > 0 && (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>chave</TableHead>
                            <TableHead>descrição</TableHead>
                            <TableHead>escopo</TableHead>
                            <TableHead>status</TableHead>
                            <TableHead className="text-right">ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {flags.data.map((flag) => (
                            <TableRow key={flag.id}>
                                <TableCell className="font-mono text-xs font-medium">{flag.key}</TableCell>
                                <TableCell className="max-w-64 truncate text-sm">{flag.description ?? "-"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {flag.scope === "global" ? "global" : `tenant ${flag.tenantId?.slice(0, 8) ?? ""}`}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <button
                                        className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${flag.enabled ? "justify-end bg-primary" : "justify-start bg-muted"}`}
                                        onClick={() => handleToggle(flag.id, flag.enabled)}
                                        aria-label={`alternar ${flag.key}`}
                                    >
                                        <span className="size-4 rounded-full bg-white shadow" />
                                    </button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(flag.id)}>
                                        <TrashIcon />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {showCreate && <CreateFlagForm onClose={() => setShowCreate(false)} onCreate={flags.createFlag} />}

            <ConfirmDialog
                open={!!deleting}
                onOpenChange={(open) => { if (!open) setDeleting(null) }}
                title="remover feature flag"
                description={`remover a flag "${target?.key}"?`}
                confirmLabel="remover"
                requireText={target?.key ?? ""}
                isPending={flags.deleteFlagIsPending}
                onConfirm={handleDelete}
            />
        </div>
    )
}

function CreateFlagForm({ onClose, onCreate }: {
    onClose: () => void
    onCreate: (input: { key: string, description?: string, scope: "global" | "tenant", enabled?: boolean }) => Promise<unknown>
}) {
    const [key, setKey] = useState("")
    const [description, setDescription] = useState("")
    const [scope, setScope] = useState<"global" | "tenant">("global")

    async function handleCreate() {
        if (!key.trim()) {
            toast.error("informe a chave da flag")
            return
        }
        try {
            await onCreate({ key: key.trim(), description: description.trim() || undefined, scope })
            toast.success("flag criada")
            onClose()
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao criar flag"))
        }
    }

    return (
        <Card>
            <CardContent className="flex flex-col gap-3">
                <h2 className="font-bold">nova feature flag</h2>
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-2">
                        <Label>chave</Label>
                        <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="ex: nova_pagina_pdv" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>descrição</Label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="o que a flag controla" />
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
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>cancelar</Button>
                    <Button onClick={handleCreate}>criar</Button>
                </div>
            </CardContent>
        </Card>
    )
}
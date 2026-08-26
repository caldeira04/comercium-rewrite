import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Building2Icon, ScrollTextIcon, SearchIcon, UsersIcon } from "lucide-react"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { useAdminSearch } from "@/hooks/use-admin"

type CommandMenuProps = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function CommandMenu({ open: controlledOpen, onOpenChange }: CommandMenuProps = {}) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = controlledOpen ?? internalOpen
    const setOpen = (next: boolean) => {
        if (onOpenChange) onOpenChange(next)
        else setInternalOpen(next)
    }
    const [query, setQuery] = useState("")
    const navigate = useNavigate()
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    const { data: results, isPending } = useAdminSearch(query)

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen(!open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [open])

    function handleQueryChange(value: string) {
        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => setQuery(value), 200)
    }

    function go(path: string) {
        setOpen(false)
        setQuery("")
        navigate({ to: path })
    }

    return (
        <CommandDialog open={open} onOpenChange={setOpen} title="Busca global" description="Buscar tenants, usuários e documentos">
            <CommandInput
                placeholder="Busque por empresa, CNPJ, e-mail, usuário ou ID..."
                onValueChange={handleQueryChange}
            />
            <CommandList>
                {!query.trim() && (
                    <CommandEmpty>
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <SearchIcon className="size-6 opacity-40" />
                            <span>Digite para buscar em toda a plataforma</span>
                        </div>
                    </CommandEmpty>
                )}
                {query.trim() && !isPending && (!results || results.tenants.length + results.users.length + results.admins.length === 0) && (
                    <CommandEmpty>nenhum resultado para "{query}"</CommandEmpty>
                )}

                {(results?.tenants.length ?? 0) > 0 && (
                    <CommandGroup heading="Tenants">
                        {results!.tenants.map((tenant) => (
                            <CommandItem key={tenant.id} onSelect={() => go(`/admin/tenants/${tenant.id}`)}>
                                <Building2Icon />
                                <span>{tenant.name}</span>
                                <span className="text-xs text-muted-foreground">@{tenant.slug}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{tenant.document}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {(results?.users.length ?? 0) > 0 && (
                    <CommandGroup heading="Usuários">
                        {results!.users.map((user) => (
                            <CommandItem key={user.id} onSelect={() => go(`/admin/tenants/${user.tenantId}`)}>
                                <UsersIcon />
                                <span>{user.login}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{user.tenantName}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {(results?.admins.length ?? 0) > 0 && (
                    <CommandGroup heading="Administradores">
                        {results!.admins.map((admin) => (
                            <CommandItem key={admin.id} onSelect={() => go("/admin/audit")}>
                                <ScrollTextIcon />
                                <span>{admin.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{admin.login}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    )
}
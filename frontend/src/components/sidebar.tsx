import { ChevronUp, LogOutIcon, SettingsIcon } from "lucide-react"
import { useLocation } from "@tanstack/react-router"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "./ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { items } from "./items"
import { Button } from "./ui/button"
import { Link } from "@tanstack/react-router"
import { type ResponseUser } from "@/utils/auth"
import { getApiUrl } from "@/lib/api-config"

export default function AppSidebar({ login, tenantName, tenantSlug }: Omit<ResponseUser, "tenantId">) {
    const { pathname } = useLocation()
    const normalizedPathname = pathname.replace(/\/$/, "") || "/"

    async function handleLogout() {
        await fetch(getApiUrl("/master/auth/logout"), {
            method: "POST",
            credentials: "include",
        })

        window.location.href = "/login"
    }

    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader className="px-4 pt-5 pb-4">
                <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
                    <svg className="size-7 shrink-0 text-primary" viewBox="0 0 64 64" aria-hidden="true">
                        <rect fill="currentColor" x="6" y="6" width="52" height="12" />
                        <rect fill="currentColor" x="6" y="6" width="12" height="52" />
                        <rect fill="currentColor" x="6" y="46" width="52" height="12" />
                        <rect fill="currentColor" x="34" y="26" width="12" height="12" />
                    </svg>
                    <h1 className="text-base font-medium tracking-tight">Comercium</h1>
                </Link>
            </SidebarHeader>
            <SidebarContent>
                {items.map((i) => {
                    const hasSubitem = i.subitems && i.subitems?.length > 0
                    if (hasSubitem) {
                        return (
                            <SidebarGroup key={i.label}>
                                <SidebarGroupLabel className="px-3 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{i.label}</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <SidebarMenu className="gap-1">
                                        {i.subitems.map((s) => {
                                            const isActive = normalizedPathname === s.url || normalizedPathname.startsWith(`${s.url}/`)

                                            return (
                                                <SidebarMenuItem key={s.label}>
                                                    <SidebarMenuButton asChild isActive={isActive} className="h-9 px-3">
                                                        <Link to={s.url}>
                                                            {s.icon}
                                                            <span>{s.label}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            )
                                        })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        )
                    }

                    const isActive = normalizedPathname === i.url || normalizedPathname.startsWith(`${i.url}/`)

                    return (
                        <SidebarGroup key={i.label} className="py-1">
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild isActive={isActive} className="h-9 px-3">
                                            <Link to={i.url}>
                                                {i.icon}
                                                <span>{i.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    )
                })}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton className="h-16 w-full items-center justify-between px-3">
                                    <div className="flex flex-col">
                                        <h1 className="max-w-48 truncate text-sm font-medium">{tenantName}</h1>
                                        <h2 className="text-xs text-muted-foreground">{tenantSlug}</h2>
                                        <span className="text-xs text-muted-foreground">{login}</span>
                                    </div>
                                    <ChevronUp className="ml-auto" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
                                <Button asChild variant={"link"}>
                                    <DropdownMenuItem className="w-full">
                                        <Link className="flex gap-2 items-center w-full justify-start" to="/settings">
                                            <SettingsIcon />
                                            <span>configurações</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </Button>
                                <DropdownMenuItem className="w-full justify-start text-destructive" onSelect={handleLogout}>
                                    <LogOutIcon />
                                    <span>sair</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

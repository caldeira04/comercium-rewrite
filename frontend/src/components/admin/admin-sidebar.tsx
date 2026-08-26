import {
    ActivityIcon,
    BellIcon,
    Building2Icon,
    FlagIcon,
    GaugeIcon,
    LogOutIcon,
    ReceiptIcon,
    ScrollTextIcon,
    ShieldIcon,
    UsersIcon,
} from "lucide-react"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import type { AdminUser } from "@/utils/admin-auth"
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
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { getApiUrl } from "@/lib/api-config"

const nav = [
    {
        label: "geral",
        items: [
            { label: "visão geral", url: "/admin", icon: <GaugeIcon /> },
            { label: "tenants", url: "/admin/tenants", icon: <Building2Icon /> },
            { label: "usuários", url: "/admin/users", icon: <UsersIcon /> },
            { label: "auditoria", url: "/admin/audit", icon: <ScrollTextIcon /> },
        ],
    },
    {
        label: "operações",
        items: [
            { label: "assinaturas", url: "/admin/billing", icon: <ReceiptIcon /> },
            { label: "fiscal", url: "/admin/fiscal", icon: <ShieldIcon /> },
            { label: "monitoramento", url: "/admin/monitoring", icon: <ActivityIcon /> },
        ],
    },
    {
        label: "plataforma",
        items: [
            { label: "feature flags", url: "/admin/flags", icon: <FlagIcon /> },
            { label: "comunicados", url: "/admin/announcements", icon: <BellIcon /> },
        ],
    },
]

export function AdminSidebar({ admin }: { admin: AdminUser }) {
    const { pathname } = useLocation()
    const navigate = useNavigate()

    async function handleLogout() {
        await fetch(getApiUrl("/admin/auth/logout"), {
            method: "POST",
            credentials: "include",
        })
        navigate({ to: "/admin/login" })
        window.location.reload()
    }

    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader className="mt-2 flex items-center justify-center">
                <Link to="/admin">
                    <h1 className="text-3xl font-bold uppercase">Comercium</h1>
                </Link>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">painel administrativo</span>
            </SidebarHeader>
            <SidebarContent>
                {nav.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const isActive = item.url === "/admin"
                                        ? pathname === "/admin" || pathname === "/admin/"
                                        : pathname.startsWith(item.url)
                                    return (
                                        <SidebarMenuItem key={item.url}>
                                            <SidebarMenuButton asChild isActive={isActive}>
                                                <Link to={item.url} className="flex gap-2 items-center">
                                                    {item.icon}
                                                    <span>{item.label}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex w-full flex-col gap-1 rounded-lg border p-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold">{admin.name}</span>
                                <span className="text-xs uppercase text-muted-foreground">{admin.role}</span>
                            </div>
                            <span className="truncate text-xs text-muted-foreground">{admin.login}</span>
                        </div>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleLogout}>
                            <LogOutIcon />
                            <span>sair</span>
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
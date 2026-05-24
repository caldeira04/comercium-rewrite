import { ChevronUp, LogOutIcon, SettingsIcon } from "lucide-react"
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
} from "./ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { items } from "./items"
import { Button } from "./ui/button"
import { Link } from "@tanstack/react-router"
import { type ResponseUser } from "@/utils/auth"

export default function AppSidebar({ login, tenantName, tenantSlug, userId }: ResponseUser) {

    return (
        <Sidebar>
            <SidebarHeader className="mt-2 flex items-center justify-center">
                <h1 className="text-3xl font-bold uppercase">Comercium</h1>
            </SidebarHeader>
            <SidebarContent>
                {items.map((i) => {
                    const hasSubitem = i.subitems && i.subitems?.length > 0
                    if (hasSubitem) {
                        return (
                            <SidebarGroup>
                                <SidebarGroupLabel>{i.label}</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    {i.subitems.map((s) => (
                                        <SidebarMenuItem>
                                            <Button variant={"link"}>
                                                <Link to={s.url} className="flex gap-2 items-center justify-center">
                                                    {s.icon} {s.label}
                                                </Link>
                                            </Button>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarGroupContent>
                            </SidebarGroup>
                        )
                    }
                })}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton className="h-24 w-full items-center justify-between">
                                    <div className="flex flex-col">
                                        <h1 className="font-bold text-2xl">{tenantName}</h1>
                                        <h2 className="text-muted-foreground">{tenantSlug}</h2>
                                        <span>{login}</span>
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
                                <Button asChild variant={"destructive"}>
                                    <DropdownMenuItem className="w-full justify-start">
                                        <LogOutIcon />
                                        <span>sair</span>
                                    </DropdownMenuItem>
                                </Button>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

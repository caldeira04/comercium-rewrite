import { useState } from "react"
import { SearchIcon } from "lucide-react"
import { Outlet } from "@tanstack/react-router"
import type { AdminUser } from "@/utils/admin-auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { CommandMenu } from "@/components/admin/command-menu"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function AdminLayout({ admin }: { admin: AdminUser }) {
    const [searchOpen, setSearchOpen] = useState(false)

    return (
        <SidebarProvider>
            <div className="flex w-full min-h-screen">
                <AdminSidebar admin={admin} />
                <SidebarInset>
                    <header className="flex h-14 items-center justify-between border-b px-4">
                        <div className="flex-1" />
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-muted-foreground"
                            onClick={() => setSearchOpen(true)}
                        >
                            <SearchIcon className="size-4" />
                            <span>busca global</span>
                            <kbd className="ml-2 rounded border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
                        </Button>
                    </header>
                    <main className="flex-1 overflow-y-auto p-4">
                        <Outlet />
                    </main>
                </SidebarInset>
            </div>
            <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
        </SidebarProvider>
    )
}
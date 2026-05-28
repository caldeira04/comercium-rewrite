import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { LogOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ModeToggle } from "@/components/theme-toggle"
import { loaderCredentials } from "@/utils/auth"
import { getApiUrl } from "@/lib/api-config"

export const Route = createFileRoute("/settings/")({
    loader: loaderCredentials,
    component: RouteComponent,
})

function RouteComponent() {
    const { user } = Route.useLoaderData()
    const router = useRouter()

    async function handleLogout() {
        await fetch(getApiUrl("/master/auth/logout"), {
            method: "POST",
            credentials: "include",
        })
        toast.success("sessão encerrada")
        await router.invalidate()
        window.location.href = "/login"
    }

    return (
        <div className="flex h-screen w-full flex-col gap-4 self-start p-4">
            <div>
                <h1 className="text-2xl font-bold uppercase">configurações</h1>
                <p className="text-muted-foreground">informações locais da empresa e preferências do usuário</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex flex-col gap-3">
                        <h2 className="font-bold">empresa</h2>
                        <Info label="nome" value={user?.tenantName ?? "-"} />
                        <Info label="identificador" value={user?.tenantSlug ?? "-"} />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex flex-col gap-3">
                        <h2 className="font-bold">usuário</h2>
                        <Info label="login" value={user?.login ?? "-"} />
                        <Info label="ID" value={String(user?.userId ?? "-")} />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex flex-col gap-3">
                        <h2 className="font-bold">preferências</h2>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <span>tema</span>
                            <ModeToggle />
                        </div>
                        <Button variant="destructive" onClick={handleLogout}><LogOutIcon />sair</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function Info({ label, value }: { label: string, value: string }) {
    return <div className="rounded-lg border p-3"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="font-bold">{value}</p></div>
}

import { AlertTriangleIcon, LogOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiUrl } from "@/lib/api-config"

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
    async function handleExit() {
        try {
            await fetch(getApiUrl("/master/auth/logout"), {
                method: "POST",
                credentials: "include",
            })
        } catch {
            // ignore, cookie is cleared below regardless
        }

        document.cookie = "session=; path=/; max-age=0"
        window.location.href = "/admin"
    }

    return (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 border-b border-destructive/30 bg-destructive px-4 py-2 text-sm text-white">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <span className="font-medium">
                Você está acessando o Comercium como <strong>{tenantName}</strong> (modo de inspeção administrativa)
            </span>
            <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20"
                onClick={handleExit}
            >
                <LogOutIcon className="size-3.5" />
                sair do modo de inspeção
            </Button>
        </div>
    )
}
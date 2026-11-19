import { Link, useLocation } from "@tanstack/react-router"
import { SidebarTrigger } from "./ui/sidebar"
import { items } from "./items"

function findPageLabel(pathname: string) {
    for (const item of items) {
        if (item.subitems) {
            const sub = item.subitems.find((s) => pathname === s.url || pathname.startsWith(`${s.url}/`))
            if (sub) return sub.label
        } else if (pathname === item.url || pathname.startsWith(`${item.url}/`)) {
            return item.label
        }
    }
    return null
}

/** Barra superior exibida só em telas pequenas, onde o sidebar vira um Sheet. */
export default function MobileHeader() {
    const { pathname } = useLocation()
    const normalizedPathname = pathname.replace(/\/$/, "") || "/"
    const label = findPageLabel(normalizedPathname)

    return (
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-2 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
            <SidebarTrigger className="size-9" aria-label="Abrir menu" />
            <Link to="/dashboard" className="flex items-center gap-2" aria-label="Comercium">
                <svg className="size-5 shrink-0 text-primary" viewBox="0 0 64 64" aria-hidden="true">
                    <rect fill="currentColor" x="6" y="6" width="52" height="12" />
                    <rect fill="currentColor" x="6" y="6" width="12" height="52" />
                    <rect fill="currentColor" x="6" y="46" width="52" height="12" />
                    <rect fill="currentColor" x="34" y="26" width="12" height="12" />
                </svg>
            </Link>
            {label && <span className="truncate text-sm font-medium">{label}</span>}
        </header>
    )
}

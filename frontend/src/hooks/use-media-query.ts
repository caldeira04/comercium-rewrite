import { useCallback, useSyncExternalStore } from "react"

/** Lê uma media query de forma síncrona, sem "piscar" o layout errado no primeiro render. */
export function useMediaQuery(query: string) {
    const subscribe = useCallback((onChange: () => void) => {
        const mql = window.matchMedia(query)
        mql.addEventListener("change", onChange)
        return () => mql.removeEventListener("change", onChange)
    }, [query])

    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(query).matches,
        () => false
    )
}

/** Breakpoint `lg` do Tailwind: a partir dele cabem lista e detalhe lado a lado. */
export function useIsDesktop() {
    return useMediaQuery("(min-width: 1024px)")
}

import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { queryClient } from "@/lib/queryClient"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"

export function getRouter() {
    const router = createRouter({
        routeTree,

        context: { queryClient },
        scrollRestoration: true,
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
    })

    setupRouterSsrQueryIntegration({
        router,
        queryClient
    })

    return router
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>
    }
}

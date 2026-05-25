import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const tanstackStartInjectedHeadScriptsShim = {
    name: "tanstack-start-injected-head-scripts-shim",
    resolveId(id: string) {
        if (id === "tanstack-start-injected-head-scripts:v") {
            return id
        }
    },
    load(id: string) {
        if (id === "tanstack-start-injected-head-scripts:v") {
            return "export const injectedHeadScripts = ''"
        }
    },
}

const config = defineConfig({
    plugins: [
        tanstackStartInjectedHeadScriptsShim,
        devtools(),
        tanstackStart(),
        nitro(),
        // this is the plugin that enables path aliases
        viteTsConfigPaths({
            projects: ["./tsconfig.json"],
        }),
        tailwindcss(),
        viteReact(),
    ],
})

export default config

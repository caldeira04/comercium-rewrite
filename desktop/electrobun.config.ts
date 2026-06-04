import type { ElectrobunConfig } from "electrobun"

export default {
    app: {
        name: "Comercium",
        identifier: "dev.comercium.app",
        version: "0.1.0",
    },
    build: {
        copy: {
            "dist/backend": "backend",
            "../backend/drizzle/migrations": "backend/drizzle/migrations",
            "../frontend/.output": "frontend",
        },
        linux: {
            defaultRenderer: "native",
        },
        bun: {
            entrypoint: "src/index.ts",
        },
    },
    scripts: {
        postBuild: "scripts/wrap-linux-launcher.ts",
    },
} satisfies ElectrobunConfig

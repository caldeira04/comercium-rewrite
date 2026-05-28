import type { ElectrobunConfig } from "electrobun"

export default {
    app: {
        name: "Comercium",
        identifier: "dev.comercium.app",
        version: "0.1.0",
    },
    build: {
        bun: {
            entrypoint: "src/main.ts",
        },
    },
} satisfies ElectrobunConfig

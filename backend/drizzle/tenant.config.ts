import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./src/db/schema/tenant/index.ts",
    out: "./drizzle/migrations/tenant",
    dialect: "sqlite",
    dbCredentials: {
        url: "./data/tenant-template.sqlite",
    },
})

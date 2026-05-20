import { defineConfig } from "drizzle-kit"

export default defineConfig({
    schema: "./src/db/schema/master/index.ts",
    out: "./drizzle/migrations/master",
    dialect: "sqlite",
    dbCredentials: {
        url: "./data/master.sqlite",
    },
})

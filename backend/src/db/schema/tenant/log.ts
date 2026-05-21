import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditing, timestamps } from "@/utils/drizzle"

export const log = sqliteTable("log", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    referenceType: text("reference_type"),
    referenceId: text("reference_id"),

    ...auditing(),
    ...timestamps()
})

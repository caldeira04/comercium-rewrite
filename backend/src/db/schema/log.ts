import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auditing, timestamps, id } from "@/utils/drizzle"

export const log = sqliteTable("log", {
    ...id(),

    referenceType: text("reference_type"),
    referenceId: text("reference_id"),

    ...auditing(),
    ...timestamps()
})

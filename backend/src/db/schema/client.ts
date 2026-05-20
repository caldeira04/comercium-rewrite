import { timestamps } from "@/utils/drizzle";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const client = sqliteTable("client", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    document: text("document"),
    email: text("email"),
    phone: text("phone"),
    ...timestamps
})

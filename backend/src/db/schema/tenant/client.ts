import { auditing, timestamps } from "@/utils/drizzle";
import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sale } from "./sale";

export const client = sqliteTable("client", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    document: text("document"),
    email: text("email"),
    phone: text("phone"),

    ...auditing(),
    ...timestamps()
})

export const clientRelations = relations(client, ({ many }) => ({
    sales: many(sale)
}))

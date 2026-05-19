import { text } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const timestamps = {
    createdAt: text("created-at").notNull().default(sql`(CURRENT TIMESTAMP)`),
    updatedAt: text("updated-at").notNull().default(sql`(CURRENT TIMESTAMP)`),
    deletedAt: text("deleted-at"),
}

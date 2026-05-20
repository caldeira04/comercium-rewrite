import { text } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { generateUniqueString } from "./general"

export const timestamps = () => ({
    createdAt: text("created_at").notNull().default(sql`(CURRENT TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT TIMESTAMP)`),
    deletedAt: text("deleted_at"),
})

export const id = () => ({
    id: text("id").primaryKey().$default(() => generateUniqueString(24))
})

export const auditing = () => ({
    createdByUserId: text("created_by_user_id"),
    updatedByUserId: text("updated_by_user_id"),
    deletedByUserId: text("deleted_by_user_id")
})

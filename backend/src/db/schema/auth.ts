import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { timestamps, id } from "@/utils/drizzle"
import { tenant } from "./tenant"

export const tenantUser = sqliteTable("tenant_users", {
    tenantId: text("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    login: text("login").notNull().unique(),
    password: text("password").notNull(),

    ...id(),
    ...timestamps()
})

export const session = sqliteTable("session", {
    ...id(),
    tenantUserId: text("tenant_user_id").notNull().references(() => tenantUser.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: timestamps().createdAt,
})

import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { timestamps, id } from "@/utils/drizzle"
import { tenant } from "./tenant"
import { relations } from "drizzle-orm"

export const tenantUser = sqliteTable("tenant_users", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    tenantId: text("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    login: text("login").notNull(),
    password: text("password").notNull(),

    ...timestamps()
}, (table) => [
    uniqueIndex("tenant_users_tenant_id_login_unique").on(table.tenantId, table.login),
])

export const session = sqliteTable("session", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    tenantUserId: text("tenant_user_id").notNull().references(() => tenantUser.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: timestamps().createdAt,
})

export const tenantUserRelations = relations(tenantUser, ({ one }) => ({
    tenant: one(tenant, {
        fields: [tenantUser.tenantId],
        references: [tenant.id]
    })
}))

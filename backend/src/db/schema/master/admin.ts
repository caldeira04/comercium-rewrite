import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
import { timestamps } from "@/utils/drizzle"
import { tenant } from "./tenant"

export const adminUser = sqliteTable("admin_user", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    name: text("name").notNull(),
    login: text("login").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["owner", "admin"] }).notNull().default("admin"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),

    ...timestamps()
}, (table) => [
    uniqueIndex("admin_user_login_unique").on(table.login),
])

export const adminSession = sqliteTable("admin_session", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    adminUserId: text("admin_user_id").notNull().references(() => adminUser.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: timestamps().createdAt,
})

export const adminAuditLog = sqliteTable("admin_audit_log", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    adminUserId: text("admin_user_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    tenantId: text("tenant_id").references(() => tenant.id, { onDelete: "set null" }),
    metadata: text("metadata"),
    result: text("result", { enum: ["success", "failure"] }).notNull().default("success"),

    createdAt: timestamps().createdAt,
})

export const systemError = sqliteTable("system_error", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    tenantId: text("tenant_id"),
    method: text("method"),
    path: text("path"),
    statusCode: integer("status_code"),
    errorCode: text("error_code"),
    message: text("message"),
    stack: text("stack"),

    createdAt: timestamps().createdAt,
})

export const featureFlag = sqliteTable("feature_flag", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    key: text("key").notNull(),
    description: text("description"),
    scope: text("scope", { enum: ["global", "tenant"] }).notNull().default("global"),
    tenantId: text("tenant_id").references(() => tenant.id, { onDelete: "cascade" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),

    ...timestamps()
}, (table) => [
    uniqueIndex("feature_flag_key_scope_tenant_unique").on(table.key, table.scope, table.tenantId),
])

export const announcement = sqliteTable("announcement", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    title: text("title").notNull(),
    body: text("body").notNull(),
    scope: text("scope", { enum: ["global", "tenant"] }).notNull().default("global"),
    tenantId: text("tenant_id").references(() => tenant.id, { onDelete: "cascade" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    createdByAdminId: text("created_by_admin_id").references(() => adminUser.id, { onDelete: "set null" }),

    ...timestamps()
})
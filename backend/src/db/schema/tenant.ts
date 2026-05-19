import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core"
import { generateUniqueString } from "@/utils/general"
import { timestamps } from "@/utils/drizzle"

export const tenant = sqliteTable("tenant", {
    id: text("id").primaryKey().$default(() => generateUniqueString(24)),

    name: text("name").notNull(),
    slug: text("slug").notNull(),
    legalName: text("legal_name"),

    document: text("document").notNull(),

    email: text("email").notNull(),
    phone: text("phone").notNull(),

    zipcode: text("zipcode"),
    street: text("street"),
    state: text("state"),
    district: text("district"),
    city: text("city"),
    number: text("number"),
    country: text("country"),

    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),

    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    currency: text("currency").notNull().default("BRL"),

    planId: text("plan_id"),
    subscriptionStatusId: text("subscription_status_id").notNull(),
    subscriptionExpireDate: text("subscription_expire_date"),

    isActive: integer("is_active", { mode: "boolean" }).default(true),

    ...timestamps
})

export const tenantUser = sqliteTable("tenant_users", {
    id: text("id").primaryKey().$default(() => generateUniqueString(24)),
    tenantId: text("tenant_id").notNull().references(() => tenant.id, { onDelete: "cascade" }),
    login: text("login").notNull().unique(),
    password: text("password").notNull(),

    ...timestamps
})

export const subscriptionStatus = sqliteTable("subscription_status", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    label: text("label").notNull()
})

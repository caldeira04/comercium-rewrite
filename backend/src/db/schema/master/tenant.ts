import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { timestamps } from "@/utils/drizzle"

export const tenant = sqliteTable("tenant", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
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
    subscriptionStatusId: text("subscription_status_id"),
    subscriptionExpireDate: text("subscription_expire_date"),

    isActive: integer("is_active", { mode: "boolean" }).default(true),

    ...timestamps()
})

export const subscriptionStatus = sqliteTable("subscription_status", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    label: text("label").notNull()
})

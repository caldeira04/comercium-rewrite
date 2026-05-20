import { auditing, timestamps } from "@/utils/drizzle";
import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const product = sqliteTable("product", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    gtin: text("gtin"),
    sellPrice: integer("sell_price").notNull(),
    buyPrice: integer("buy_price").notNull(),
    productSettingsId: integer("product_settings_id").references(() => productSettings.id, { onDelete: "set null" }),
    ...auditing(),
    ...timestamps()
})

export const productSettings = sqliteTable("product_settings", {
    id: integer("id").primaryKey({ autoIncrement: true }),
})

export const productRelations = relations(product, ({ one }) => ({
    productSettings: one(productSettings, {
        fields: [product.productSettingsId],
        references: [productSettings.id]
    })
}))

export const productSettingsRelations = relations(productSettings, ({ many }) => ({
    product: many(product)
}))

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { product } from "./product";
import { timestamps, auditing, id } from "@/utils/drizzle";
import { client } from "./client";

export const sale = sqliteTable("sale", {
    ...id(),

    totalAmount: integer("total_amount").notNull().default(0),
    clientId: integer("client_id").notNull().references(() => client.id, { onDelete: "restrict" }),
    settledAt: text("settled_at"),
    cancelledAt: text("cancelled_at"),

    ...auditing(),
    ...timestamps()
})

export const saleRelations = relations(sale, ({ many }) => ({
    saleItem: many(saleItem)
}))

export const saleItem = sqliteTable("sale_items", {
    saleId: text("id").notNull().references(() => sale.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => product.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),

    ...id(),
    ...auditing(),
    ...timestamps()
})

export const saleItemRelations = relations(saleItem, ({ one }) => ({
    sale: one(sale, {
        fields: [saleItem.saleId],
        references: [sale.id]
    }),

    product: one(product, {
        fields: [saleItem.productId],
        references: [product.id]
    }),
}))

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { product } from "./product";
import { timestamps, auditing } from "@/utils/drizzle";
import { client } from "./client";
import { cash } from "./cash";
import { payment } from "./payment";

export const sale = sqliteTable("sale", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    totalAmount: integer("total_amount").notNull().default(0),
    clientId: integer("client_id").references(() => client.id, { onDelete: "restrict" }),
    settledAt: text("settled_at"),
    cancelledAt: text("cancelled_at"),
    cashId: text("cash_id").notNull().references(() => cash.id, { onDelete: "restrict" }),

    ...auditing(),
    ...timestamps()
})

export const saleRelations = relations(sale, ({ many, one }) => ({
    saleItem: many(saleItem),
    client: one(client, {
        fields: [sale.clientId],
        references: [client.id]
    }),
    cash: one(cash, {
        fields: [sale.cashId],
        references: [cash.id]
    }),
    payment: many(payment)
}))

export const saleItem = sqliteTable("sale_items", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    saleId: text("sale_id").notNull().references(() => sale.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => product.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalPrice: integer("total_price").notNull(),
    discount: integer("discount"),
    deleteReason: text("delete_reason"),

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

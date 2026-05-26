import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sale } from "./sale";
import { auditing, timestamps } from "@/utils/drizzle";
import { relations } from "drizzle-orm";

export const payment = sqliteTable("payment", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    saleId: text("sale_id").notNull().references(() => sale.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),

    paymentMethod: text("payment_method", {
        enum: ["cash", "pix", "debit", "credit", "voucher"]
    }).notNull(),

    status: text("status", {
        enum: ["pending", "paid", "cancelled", "refunded"]
    }).notNull().default("paid"),

    paidAt: text("paid_at"),

    ...timestamps(),
    ...auditing()
})

export const paymentRelations = relations(payment, ({ one }) => ({
    sale: one(sale, {
        fields: [payment.saleId],
        references: [sale.id]
    })
}))

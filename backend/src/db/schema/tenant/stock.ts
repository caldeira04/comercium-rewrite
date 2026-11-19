import { timestamps, auditing } from "@/utils/drizzle";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { product } from "./product";
import { relations } from "drizzle-orm";

export const stockMovement = sqliteTable("stock_movement", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    productId: integer("product_id").notNull().references(() => product.id, { onDelete: "restrict" }),
    type: text("type", {
        enum: ["in", "out", "adjustment", "transfer"]
    }).notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason"),

    referenceType: text("reference_type", { enum: ["sale", "purchase", "refund", "manual"] }),
    referenceId: text("reference_id"),

    ...auditing(),
    ...timestamps()
}, (table) => [
    index("stock_movement_product_created_idx").on(table.productId, table.createdAt),
])

export const stockMovementRelations = relations(stockMovement, ({ one }) => ({
    product: one(product, {
        fields: [stockMovement.productId],
        references: [product.id]
    })
}))

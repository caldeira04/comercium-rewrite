import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core"
import { timestamps, auditing } from "@/utils/drizzle"
import { relations } from "drizzle-orm"
import { sale } from "./sale"

export const cash = sqliteTable("cash", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    // Número sequencial exibido ao cliente (ver trigger `cash_assign_number`).
    number: integer("number").notNull().default(0),

    openingAmount: integer("opening_amount").notNull().default(0),
    expectedClosingAmount: integer("expected_closing_amount"),
    actualClosingAmount: integer("actual_closing_amount"),
    closedAt: text("closed_at"),
    closedByUserId: text("closed_by_user_id"),

    ...auditing(),
    ...timestamps()
}, (table) => [
    uniqueIndex("cash_number_idx").on(table.number),
])

export const cashMovement = sqliteTable("cash_movement", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    cashId: text("cash_id").notNull().references(() => cash.id, { onDelete: "restrict" }),
    nature: text("nature", { enum: ["in", "out"] }).notNull(),
    type: text("type", { enum: ["payment", "drop", "topup", "open", "refund"] }).notNull(),
    amount: integer("amount").notNull(),
    description: text("description"),

    referenceType: text("reference_type", { enum: ["payment", "purchase", "refund", "manual"] }),
    referenceId: text("reference_id"),

    ...auditing(),
    ...timestamps()
}, (table) => [
    index("cash_movement_cash_idx").on(table.cashId),
    index("cash_movement_reference_idx").on(table.referenceType, table.referenceId),
])

export const cashRelations = relations(cash, ({ many }) => ({
    cashMovements: many(cashMovement),
    sales: many(sale),
}))

export const cashMovementRelations = relations(cashMovement, ({ one }) => ({
    cash: one(cash, {
        fields: [cashMovement.cashId],
        references: [cash.id]
    })
}))

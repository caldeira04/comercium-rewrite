import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { timestamps, auditing } from "@/utils/drizzle"
import { relations } from "drizzle-orm"
import { sale } from "./sale"

export const cash = sqliteTable("cash", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    openingAmount: integer("opening_amount").notNull().default(0),
    expectedClosingAmount: integer("expected_closing_amount"),
    actualClosingAmount: integer("actual_closing_amount"),
    closedAt: text("closed_at"),
    closedByUserId: text("closed_by_user_id"),

    ...auditing(),
    ...timestamps()
})

export const cashMovement = sqliteTable("cash_movement", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    cashId: text("cash_id").notNull().references(() => cash.id, { onDelete: "restrict" }),
    nature: text("nature", { enum: ["in", "out"] }).notNull(),
    type: text("type", { enum: ["sale", "drop", "topup", "open", "refund"] }).notNull(),
    amount: integer("amount").notNull(),
    description: text("description"),

    referenceType: text("reference_type", { enum: ["sale", "purchase", "refund", "manual"] }),
    referenceId: text("reference_id"),

    ...auditing(),
    ...timestamps()
})

export const cashRelations = relations(cash, ({ many }) => ({
    cashMovements: many(cashMovement),
    sales: many(sale)
}))

import { auditing, timestamps } from "@/utils/drizzle";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { stockMovement } from "./stock";

export const payee = sqliteTable("payee", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    name: text("name").notNull(),
    kind: text("kind", {
        enum: ["supplier", "employee", "other"]
    }).notNull().default("supplier"),

    document: text("document"),
    phone: text("phone"),
    email: text("email"),

    ...auditing(),
    ...timestamps()
}, (table) => [
    index("payee_name_idx").on(table.name),
])

export const expenseCategory = sqliteTable("expense_category", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    name: text("name").notNull().unique(),

    ...auditing(),
    ...timestamps()
})

export const bankAccount = sqliteTable("bank_account", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    name: text("name").notNull(),
    kind: text("kind", {
        enum: ["cash", "checking", "savings", "other"]
    }).notNull().default("checking"),

    bankName: text("bank_name"),
    agency: text("agency"),
    accountNumber: text("account_number"),
    isActive: integer("is_active").notNull().default(1),

    ...auditing(),
    ...timestamps()
}, (table) => [
    index("bank_account_name_idx").on(table.name),
])

export const payable = sqliteTable("payable", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    dueDate: text("due_date").notNull(),
    paidDate: text("paid_date"),

    paymentMethod: text("payment_method", {
        enum: ["cash", "pix", "debit", "credit", "voucher"]
    }),

    payeeId: text("payee_id").references(() => payee.id, { onDelete: "set null" }),
    categoryId: text("category_id").references(() => expenseCategory.id, { onDelete: "set null" }),
    bankAccountId: text("bank_account_id").references(() => bankAccount.id, { onDelete: "set null" }),

    notes: text("notes"),

    origin: text("origin", {
        enum: ["manual", "stock_purchase"]
    }).notNull().default("manual"),
    stockMovementId: text("stock_movement_id").references(() => stockMovement.id, { onDelete: "restrict" }),

    installmentNumber: integer("installment_number").notNull().default(1),
    installmentCount: integer("installment_count").notNull().default(1),
    groupId: text("group_id"),

    ...auditing(),
    ...timestamps()
}, (table) => [
    index("payable_due_date_idx").on(table.dueDate),
    index("payable_paid_date_idx").on(table.paidDate),
    index("payable_payee_idx").on(table.payeeId),
    index("payable_bank_account_idx").on(table.bankAccountId),
    index("payable_group_idx").on(table.groupId),
    uniqueIndex("payable_stock_movement_installment_idx").on(table.stockMovementId, table.installmentNumber),
])

export const payeeRelations = relations(payee, ({ many }) => ({
    payables: many(payable)
}))

export const expenseCategoryRelations = relations(expenseCategory, ({ many }) => ({
    payables: many(payable)
}))

export const bankAccountRelations = relations(bankAccount, ({ many }) => ({
    payables: many(payable)
}))

export const payableRelations = relations(payable, ({ one }) => ({
    payee: one(payee, {
        fields: [payable.payeeId],
        references: [payee.id]
    }),
    category: one(expenseCategory, {
        fields: [payable.categoryId],
        references: [expenseCategory.id]
    }),
    bankAccount: one(bankAccount, {
        fields: [payable.bankAccountId],
        references: [bankAccount.id]
    }),
    stockMovement: one(stockMovement, {
        fields: [payable.stockMovementId],
        references: [stockMovement.id]
    })
}))

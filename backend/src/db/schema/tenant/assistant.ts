import { auditing, timestamps } from "@/utils/drizzle";
import { relations } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const assistantConversation = sqliteTable("assistant_conversation", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    title: text("title").notNull(),

    ...auditing(),
    ...timestamps()
}, (table) => [
    index("assistant_conversation_user_idx").on(table.createdByUserId),
])

export const assistantMessage = sqliteTable("assistant_message", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),

    conversationId: text("conversation_id").notNull().references(() => assistantConversation.id, { onDelete: "cascade" }),
    role: text("role", {
        enum: ["user", "assistant", "tool"]
    }).notNull(),
    content: text("content").notNull().default(""),

    // JSON das chamadas de ferramenta pedidas pelo modelo (mensagens "assistant")
    toolCalls: text("tool_calls"),
    // Identifica a chamada respondida e a ferramenta usada (mensagens "tool")
    toolCallId: text("tool_call_id"),
    toolName: text("tool_name"),

    ...auditing(),
    ...timestamps()
}, (table) => [
    index("assistant_message_conversation_idx").on(table.conversationId),
])

export const assistantConversationRelations = relations(assistantConversation, ({ many }) => ({
    messages: many(assistantMessage)
}))

export const assistantMessageRelations = relations(assistantMessage, ({ one }) => ({
    conversation: one(assistantConversation, {
        fields: [assistantMessage.conversationId],
        references: [assistantConversation.id]
    })
}))

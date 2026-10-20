import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"

export const assistantKnowledgeDocument = sqliteTable("assistant_knowledge_document", {
    sourceFile: text("source_file").primaryKey(),
    contentHash: text("content_hash").notNull(),
    indexedAt: text("indexed_at").notNull(),
})

export const assistantKnowledgeChunk = sqliteTable("assistant_knowledge_chunk", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    sourceFile: text("source_file").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
}, (table) => [
    uniqueIndex("assistant_knowledge_chunk_source_index_unique").on(table.sourceFile, table.chunkIndex),
])

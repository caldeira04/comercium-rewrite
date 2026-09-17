import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { sale } from "./sale"
import { auditing, timestamps } from "@/utils/drizzle"

export const fiscalDocument = sqliteTable("fiscal_document", {
    id: text("id").primaryKey().$default(() => crypto.randomUUID()),
    saleId: text("sale_id").notNull().references(() => sale.id, { onDelete: "cascade" }),
    ref: text("ref").notNull().unique(),
    status: text("status", {
        enum: ["pendente", "processando", "autorizado", "erro_autorizacao", "denegado", "cancelado"],
    }).notNull().default("pendente"),
    environment: text("environment", {
        enum: ["homologacao", "producao"],
    }).notNull().default("homologacao"),
    sefazCode: text("sefaz_code"),
    sefazMessage: text("sefaz_message"),
    chaveNfe: text("chave_nfe"),
    numero: text("numero"),
    serie: text("serie"),
    xmlPath: text("xml_path"),
    danfePath: text("danfe_path"),
    qrcodeUrl: text("qrcode_url"),
    consultaUrl: text("consulta_url"),
    cancelXmlPath: text("cancel_xml_path"),
    cancelProtocolo: text("cancel_protocolo"),
    lastRequest: text("last_request"),
    lastResponse: text("last_response"),
    attemptCount: integer("attempt_count").notNull().default(1),
    ...auditing(),
    ...timestamps(),
})

export const fiscalDocumentRelations = relations(fiscalDocument, ({ one }) => ({
    sale: one(sale, {
        fields: [fiscalDocument.saleId],
        references: [sale.id],
    }),
}))

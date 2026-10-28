import { createHash } from "node:crypto"
import { mkdirSync, rmSync } from "node:fs"
import path from "node:path"
import { and, eq, isNull, lt, sql } from "drizzle-orm"
import { getTenantDb } from "@/db/db"
import { assistantAttachment } from "@/db/schema/tenant"
import { getTenantAttachmentsDir } from "@/config/paths"
import { AppError } from "../../utils/errors"

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
// Anexo enviado e não usado em nenhuma mensagem é apagado depois de um dia
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000

type AttachmentRow = typeof assistantAttachment.$inferSelect

function attachmentPath(tenantSlug: string, attachmentId: string) {
    return path.join(getTenantAttachmentsDir(tenantSlug), attachmentId)
}

function isXml(file: File) {
    return file.name.toLowerCase().endsWith(".xml") || /(^|\/|\+)xml$/.test(file.type)
}

function removeFiles(tenantSlug: string, rows: AttachmentRow[]) {
    for (const row of rows) {
        rmSync(attachmentPath(tenantSlug, row.id), { force: true })
    }
}

async function removeOrphans(tenantSlug: string, userId: string) {
    const db = getTenantDb(tenantSlug)
    const cutoff = new Date(Date.now() - ORPHAN_TTL_MS).toISOString().slice(0, 19).replace("T", " ")
    const orphans = await db.delete(assistantAttachment)
        .where(and(
            eq(assistantAttachment.createdByUserId, userId),
            isNull(assistantAttachment.messageId),
            lt(assistantAttachment.createdAt, cutoff),
        ))
        .returning()

    removeFiles(tenantSlug, orphans)
}

// Por enquanto só XML (NF-e); imagens e PDF entram com a leitura de boletos
export async function saveAssistantAttachment(tenantSlug: string, userId: string, file: File) {
    if (!isXml(file)) {
        throw new AppError("por enquanto só aceito o XML da NF-e", 415, "UNSUPPORTED_ATTACHMENT")
    }
    if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) {
        throw new AppError("o arquivo deve ter até 5 MB", 413, "ATTACHMENT_TOO_LARGE")
    }

    await removeOrphans(tenantSlug, userId)

    const content = new Uint8Array(await file.arrayBuffer())
    const id = crypto.randomUUID()
    mkdirSync(getTenantAttachmentsDir(tenantSlug), { recursive: true })
    await Bun.write(attachmentPath(tenantSlug, id), content)

    const db = getTenantDb(tenantSlug)
    const [created] = await db.insert(assistantAttachment).values({
        id,
        fileName: path.basename(file.name).slice(0, 200) || "anexo.xml",
        mimeType: "application/xml",
        size: content.byteLength,
        sha256: createHash("sha256").update(content).digest("hex"),
        createdByUserId: userId,
        updatedByUserId: userId,
    }).returning()

    return { id: created.id, fileName: created.fileName, size: created.size }
}

export async function findOwnAttachment(tenantSlug: string, attachmentId: string, userId: string) {
    const db = getTenantDb(tenantSlug)
    const found = await db.query.assistantAttachment.findFirst({
        where: (attachment, { and, eq, isNull }) => and(
            eq(attachment.id, attachmentId),
            eq(attachment.createdByUserId, userId),
            isNull(attachment.deletedAt),
        ),
    })

    if (!found) throw new AppError("anexo não encontrado", 404, "ASSISTANT_ATTACHMENT_NOT_FOUND")
    return found
}

export async function readAttachmentText(tenantSlug: string, attachment: AttachmentRow) {
    const file = Bun.file(attachmentPath(tenantSlug, attachment.id))
    if (!(await file.exists())) throw new AppError("o arquivo do anexo não existe mais", 404, "ASSISTANT_ATTACHMENT_NOT_FOUND")
    return await file.text()
}

export async function listConversationAttachments(tenantSlug: string, conversationId: string) {
    const db = getTenantDb(tenantSlug)
    return await db
        .select()
        .from(assistantAttachment)
        .where(and(eq(assistantAttachment.conversationId, conversationId), isNull(assistantAttachment.deletedAt)))
}

// Excluir a conversa apaga os arquivos anexados nela
export async function deleteConversationAttachments(tenantSlug: string, conversationId: string, userId: string) {
    const db = getTenantDb(tenantSlug)
    const removed = await db.update(assistantAttachment)
        .set({ deletedAt: sql`(CURRENT_TIMESTAMP)`, deletedByUserId: userId })
        .where(and(eq(assistantAttachment.conversationId, conversationId), isNull(assistantAttachment.deletedAt)))
        .returning()

    removeFiles(tenantSlug, removed)
}

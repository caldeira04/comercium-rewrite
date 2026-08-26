import { db } from "@/db/db"
import { adminAuditLog } from "@/db/schema/master/admin"

type AuditInput = {
    adminUserId?: string | null
    action: string
    targetType?: string
    targetId?: string
    tenantId?: string | null
    metadata?: Record<string, unknown>
    result?: "success" | "failure"
}

export async function audit(input: AuditInput) {
    try {
        await db.insert(adminAuditLog).values({
            adminUserId: input.adminUserId ?? null,
            action: input.action,
            targetType: input.targetType,
            targetId: input.targetId,
            tenantId: input.tenantId ?? null,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
            result: input.result ?? "success",
        })
    } catch (error) {
        console.error("failed to write audit log:", error)
    }
}
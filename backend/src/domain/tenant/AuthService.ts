import { db } from "@/db/db"
import { session, tenantUser } from "@/db/schema/auth"
import { hashToken, verifyPassword } from "@/utils/auth"
import { generateUniqueString } from "@/utils/general"
import { eq } from "drizzle-orm"

export async function login(username: string, password: string) {
    const [user] = await db
        .select()
        .from(tenantUser)
        .where(eq(tenantUser.login, username))

    if (!user) {
        throw new Error("Invalid Credentials")
    }

    const validPassword = await verifyPassword(password, user.password)

    if (!validPassword) {
        throw new Error("Invalid Credentials")
    }

    const token = generateUniqueString(48)
    const tokenHash = await hashToken(token)

    await db.insert(session).values({
        tenantUserId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        createdAt: new Date().toISOString()
    })

    return token
}

export async function validateSession(token: string) {
    const tokenHash = await hashToken(token)

    const result = await db
        .select({
            sessionId: session.id,
            expiresAt: session.expiresAt,

            userId: tenantUser.id,
            login: tenantUser.login,
            tenantId: tenantUser.tenantId
        })
        .from(session)
        .innerJoin(
            tenantUser,
            eq(session.tenantUserId, tenantUser.id)
        )
        .where(eq(session.tokenHash, tokenHash))
        .limit(1)

    const currentSession = result[0]

    if (!currentSession) {
        return null
    }

    if (new Date(currentSession.expiresAt) < new Date()) {
        return null
    }

    return currentSession
}

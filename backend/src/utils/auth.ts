
export async function hashPassword(password: string) {
    return await Bun.password.hash(password)
}

export async function verifyPassword(password: string, hash: string) {
    return await Bun.password.verify(password, hash)
}

export async function hashToken(token: string) {
    const data = new TextEncoder().encode(token)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)

    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

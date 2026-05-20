import { text } from "drizzle-orm/sqlite-core"

export const id = () => text("id").$defaultFn(() => crypto.randomUUID())

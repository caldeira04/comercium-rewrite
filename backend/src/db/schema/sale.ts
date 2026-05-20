import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { generateUniqueString } from "@/utils/general"

const sale = sqliteTable("sale", {
    id: text("id").primaryKey().$default(() => generateUniqueString(24))
})

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

/**
 * Crée une connexion Drizzle vers Neon PostgreSQL.
 * Utilise le driver HTTP serverless, adapté aux environnements edge/serverless.
 */
function createDb() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined. Please set it in your .env.local file.")
  }

  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

export const db = createDb()
export type TDatabase = ReturnType<typeof createDb>

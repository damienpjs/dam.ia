import { defineConfig } from "drizzle-kit"
import { neonConfig } from "@neondatabase/serverless"
import ws from "ws"

// Fournit un WebSocket constructor pour Node.js (requis par drizzle-kit migrate)
neonConfig.webSocketConstructor = ws

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})

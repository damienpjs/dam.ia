import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => vi.fn()),
}))

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: vi.fn(() => ({ mock: true })),
}))

describe("DB Connection (index)", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("doit throw si DATABASE_URL n'est pas définie", async () => {
    vi.stubEnv("DATABASE_URL", "")

    await expect(async () => {
      await import("@/lib/db")
    }).rejects.toThrow("DATABASE_URL is not defined")

    vi.unstubAllEnvs()
  })

  it("doit créer la connexion quand DATABASE_URL est définie", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://fake:fake@localhost/test")

    const { db } = await import("@/lib/db")
    expect(db).toBeDefined()

    vi.unstubAllEnvs()
  })
})

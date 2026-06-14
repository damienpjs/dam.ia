import { describe, it, expect, vi, beforeEach } from "vitest"

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
})

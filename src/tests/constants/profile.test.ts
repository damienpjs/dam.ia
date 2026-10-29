import { describe, it, expect } from "vitest"
import { ASSISTANT_NAME, CV, CV_BYTES, EMAIL, GITHUB, LINKEDIN } from "@/constants/profile"

describe("constants/profile", () => {
  it("affiche des adresses courtes, sans protocole", () => {
    for (const link of [EMAIL, GITHUB, LINKEDIN, CV]) {
      expect(link.label).not.toMatch(/^https?:/)
    }
  })

  it("pointe vers des destinations valides", () => {
    expect(EMAIL.href).toBe(`mailto:${EMAIL.label}`)
    expect(GITHUB.href).toMatch(/^https:\/\/github\.com\//)
    expect(LINKEDIN.href).toMatch(/^https:\/\/www\.linkedin\.com\/in\//)
    expect(CV.href).toMatch(/^\/.*\.pdf$/)
  })

  it("donne un poids de CV plausible", () => {
    expect(CV_BYTES).toBeGreaterThan(0)
  })

  it("nomme le double IA comme un fichier", () => {
    expect(ASSISTANT_NAME).toBe("damien.ia")
  })
})

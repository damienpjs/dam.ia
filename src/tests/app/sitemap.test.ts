import { describe, it, expect } from "vitest"
import sitemap from "@/app/sitemap"

describe("sitemap", () => {
  it("référence l'accueil, « à propos » et « projets »", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual(["https://damienpasulj.com", "https://damienpasulj.com/about", "https://damienpasulj.com/projects"])
  })

  it("donne la priorité à l'accueil", () => {
    const [home, ...others] = sitemap()
    expect(home.priority).toBe(1)
    for (const entry of others) {
      expect(entry.priority).toBeLessThan(1)
    }
  })
})

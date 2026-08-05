import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import AboutPage, { metadata } from "@/app/about/page"

describe("Page À propos (/about)", () => {
  it("expose des métadonnées dédiées", () => {
    expect(metadata.title).toMatch(/à propos/i)
    expect(metadata.description).toBeTruthy()
  })

  it("garde des métadonnées en français (une seule URL indexée par page)", () => {
    expect(metadata.openGraph?.locale).toBe("fr_FR")
    expect(metadata.alternates?.canonical).toBe("/about")
  })

  it("injecte les données structurées schema.org", () => {
    const { container } = render(<AboutPage />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()

    const jsonLd = JSON.parse(script!.innerHTML) as { "@type": string; name: string }
    expect(jsonLd["@type"]).toBe("Person")
    expect(jsonLd.name).toBe("Damien Pasulj")
  })

  it("rend le contenu éditorial", () => {
    render(<AboutPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/product builder/i)
  })
})

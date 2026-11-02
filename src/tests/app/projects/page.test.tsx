import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import ProjectsPage, { metadata } from "@/app/projects/page"
import { DICTIONARIES } from "@/constants/dictionary"

interface IJsonLdItem {
  position: number
  item: { "@type": string; name: string; url: string }
}

describe("Page Projets (/projects)", () => {
  it("expose des métadonnées dédiées", () => {
    expect(metadata.title).toBe("Projets")
    expect(metadata.description).toMatch(/hodl-on-a-minute/)
    expect(metadata.description).toMatch(/Komfy/)
  })

  it("garde des métadonnées en français (une seule URL indexée par page)", () => {
    expect(metadata.openGraph?.locale).toBe("fr_FR")
    expect(metadata.alternates?.canonical).toBe("/projects")
  })

  it("partage la capture de hodl-on-a-minute en grand format", () => {
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", images: ["/projects/hodl-on-a-minute.png"] })
  })

  it("injecte la liste des projets en données structurées schema.org", () => {
    const { container } = render(<ProjectsPage />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()

    const jsonLd = JSON.parse(script!.innerHTML) as { "@type": string; itemListElement: IJsonLdItem[] }
    expect(jsonLd["@type"]).toBe("ItemList")
    expect(jsonLd.itemListElement.map((entry) => entry.position)).toEqual([1, 2])
    expect(jsonLd.itemListElement.map((entry) => entry.item.url)).toEqual(DICTIONARIES.fr.projects.entries.map((project) => project.href))
    expect(jsonLd.itemListElement[0].item["@type"]).toBe("SoftwareApplication")
  })

  it("rend le contenu éditorial", () => {
    render(<ProjectsPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("projets")
  })
})

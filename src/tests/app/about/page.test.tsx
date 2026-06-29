import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import AboutPage, { metadata } from "@/app/about/page"

describe("Page À propos (/about)", () => {
  it("expose des métadonnées dédiées", () => {
    expect(metadata.title).toMatch(/à propos/i)
    expect(metadata.description).toBeTruthy()
  })

  it("affiche le titre éditorial avec le terme en dégradé animé", () => {
    const { container } = render(<AboutPage />)
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toHaveTextContent(/product builder/i)
    const highlight = container.querySelector(".text-gradient-animated")
    expect(highlight).toHaveTextContent(/enthousiaste IA/i)
  })

  it("présente le parcours complet (Apizee, elloha, IDEM)", () => {
    render(<AboutPage />)
    expect(screen.getByText("Apizee")).toBeInTheDocument()
    expect(screen.getAllByText("elloha").length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/L'IDEM/)).toBeInTheDocument()
  })

  it("marque le poste actuel d'un badge", () => {
    render(<AboutPage />)
    expect(screen.getByText("Actuel")).toBeInTheDocument()
  })

  it("liste les compétences techniques clés", () => {
    render(<AboutPage />)
    expect(screen.getAllByText("React").length).toBeGreaterThan(0)
    expect(screen.getByText("Qdrant")).toBeInTheDocument()
  })

  it("affiche les centres d'intérêt", () => {
    render(<AboutPage />)
    for (const interest of ["Voyages", "Sport", "Philosophie", "Dessin"]) {
      // Scopé sur les <li> : "Philosophie" est aussi un titre de section
      expect(screen.getByText(interest, { selector: "li" })).toBeInTheDocument()
    }
  })

  it("propose deux liens de retour vers la conversation (accueil)", () => {
    render(<AboutPage />)
    const links = screen.getAllByRole("link")
    const homeLinks = links.filter((l) => l.getAttribute("href") === "/")
    expect(homeLinks.length).toBe(2)
  })

  it("met en avant l'appel à discuter avec le double IA", () => {
    render(<AboutPage />)
    expect(screen.getByRole("link", { name: /double IA/i })).toHaveAttribute("href", "/")
  })
})

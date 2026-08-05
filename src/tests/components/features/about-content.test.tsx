import { describe, it, expect, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AboutContent } from "@/components/features/about-content"
import { renderWithLocale } from "@/tests/helpers/locale"
import { DICTIONARIES } from "@/constants/dictionary"

afterEach(() => {
  localStorage.clear()
})

describe("AboutContent", () => {
  it("affiche le titre éditorial avec le terme en dégradé animé", () => {
    const { container } = render(<AboutContent />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/product builder/i)
    expect(container.querySelector(".text-gradient-animated")).toHaveTextContent(/enthousiaste IA/i)
  })

  it("présente le parcours complet (Apizee, elloha, IDEM)", () => {
    render(<AboutContent />)
    expect(screen.getByText("Apizee")).toBeInTheDocument()
    expect(screen.getAllByText("elloha").length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/L'IDEM/)).toBeInTheDocument()
  })

  it("marque le poste actuel d'un badge", () => {
    render(<AboutContent />)
    expect(screen.getByText("Actuel")).toBeInTheDocument()
  })

  it("liste les compétences techniques clés", () => {
    render(<AboutContent />)
    expect(screen.getAllByText("React").length).toBeGreaterThan(0)
    expect(screen.getByText("Qdrant")).toBeInTheDocument()
  })

  it("affiche les centres d'intérêt", () => {
    render(<AboutContent />)
    for (const interest of DICTIONARIES.fr.about.interests) {
      // Scopé sur les <li> : « Philosophie » est aussi un titre de section
      expect(screen.getByText(interest, { selector: "li" })).toBeInTheDocument()
    }
  })

  it("propose deux liens de retour vers la conversation (accueil)", () => {
    render(<AboutContent />)
    const homeLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/")
    expect(homeLinks).toHaveLength(2)
  })

  it("met en avant l'appel à discuter avec le double IA", () => {
    render(<AboutContent />)
    expect(screen.getByRole("link", { name: /double IA/i })).toHaveAttribute("href", "/")
  })

  it("affiche le sélecteur de langue", () => {
    render(<AboutContent />)
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument()
  })

  describe("en anglais", () => {
    it("traduit le titre, les sections et l'appel à l'action", () => {
      renderWithLocale(<AboutContent />, "en")
      const { about } = DICTIONARIES.en

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(about.titleHighlight)
      expect(screen.getByText(about.storyLabel)).toBeInTheDocument()
      // Scopé sur le <p> de section : « Philosophy » est aussi un centre d'intérêt
      expect(screen.getByText(about.philosophyLabel, { selector: "p" })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: new RegExp(about.ctaLink, "i") })).toHaveAttribute("href", "/")
    })

    it("traduit le badge du poste actuel et les centres d'intérêt", () => {
      renderWithLocale(<AboutContent />, "en")
      expect(screen.getByText(DICTIONARIES.en.about.currentBadge)).toBeInTheDocument()
      expect(screen.queryByText(DICTIONARIES.fr.about.currentBadge)).not.toBeInTheDocument()
      for (const interest of DICTIONARIES.en.about.interests) {
        expect(screen.getByText(interest, { selector: "li" })).toBeInTheDocument()
      }
    })

    it("conserve les noms propres (entreprises, technos)", () => {
      renderWithLocale(<AboutContent />, "en")
      expect(screen.getByText("Apizee")).toBeInTheDocument()
      expect(screen.getByText("Qdrant")).toBeInTheDocument()
    })
  })

  it("bascule le contenu au clic sur le sélecteur", async () => {
    const user = userEvent.setup()
    renderWithLocale(<AboutContent />, "fr")

    expect(screen.getByText(DICTIONARIES.fr.about.philosophy)).toBeInTheDocument()

    await user.click(screen.getByText("EN"))

    expect(screen.getByText(DICTIONARIES.en.about.philosophy)).toBeInTheDocument()
    expect(screen.queryByText(DICTIONARIES.fr.about.philosophy)).not.toBeInTheDocument()
  })
})

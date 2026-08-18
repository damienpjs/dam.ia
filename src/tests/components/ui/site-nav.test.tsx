import { describe, it, expect, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { SiteNav } from "@/components/ui/site-nav"
import { renderWithLocale } from "@/tests/helpers/locale"
import { DICTIONARIES } from "@/constants/dictionary"

afterEach(() => {
  localStorage.clear()
})

describe("SiteNav", () => {
  it("expose un repère de navigation accessible", () => {
    render(<SiteNav current="home" />)
    expect(screen.getByRole("navigation", { name: DICTIONARIES.fr.common.navLabel })).toBeInTheDocument()
  })

  it("propose le lien « à propos » depuis l'accueil", () => {
    render(<SiteNav current="home" />)
    const link = screen.getByRole("link", { name: DICTIONARIES.fr.common.navAbout })
    expect(link).toHaveAttribute("href", "/about")
  })

  it("masque le lien lorsque « à propos » est déjà la page courante", () => {
    render(<SiteNav current="about" />)
    expect(screen.queryByRole("link", { name: DICTIONARIES.fr.common.navAbout })).not.toBeInTheDocument()
  })

  it("embarque le sélecteur de langue sur les deux routes", () => {
    const { unmount } = render(<SiteNav current="home" />)
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument()
    unmount()

    render(<SiteNav current="about" />)
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument()
  })

  it("affiche la marque fournie et les encarts contextuels", () => {
    render(
      <SiteNav current="home" brand={<button type="button">Damien Pasulj</button>}>
        <span data-testid="encart" />
      </SiteNav>,
    )
    expect(screen.getByRole("button", { name: "Damien Pasulj" })).toBeInTheDocument()
    expect(screen.getByTestId("encart")).toBeInTheDocument()
  })

  it("groupe les encarts de statut avec la marque, à gauche des liens", () => {
    const { container } = render(
      <SiteNav current="home" brand={<span data-testid="marque" />}>
        <span data-testid="encart" />
      </SiteNav>,
    )
    const groups = container.querySelectorAll("nav > div")
    expect(groups).toHaveLength(2)
    expect(groups[0]).toContainElement(screen.getByTestId("marque"))
    expect(groups[0]).toContainElement(screen.getByTestId("encart"))
    expect(groups[1]).toContainElement(screen.getByRole("link", { name: DICTIONARIES.fr.common.navAbout }))
  })

  it("n'insère pas de groupe vide quand il n'y a ni marque ni encart", () => {
    const { container } = render(<SiteNav current="home" />)
    // Un conteneur à zéro largeur décalerait le groupe de droite du `gap`.
    expect(container.querySelectorAll("nav > div")).toHaveLength(1)
  })

  it("sépare le lien du sélecteur de langue par un point médian décoratif", () => {
    const { container } = render(<SiteNav current="home" />)
    const dot = container.querySelector("span[aria-hidden='true']")
    expect(dot).toHaveTextContent("·")
  })

  it("n'affiche pas de séparateur orphelin sur la page « à propos »", () => {
    const { container } = render(<SiteNav current="about" />)
    // Seul le « / » interne au sélecteur de langue subsiste.
    const decorations = [...container.querySelectorAll("span[aria-hidden='true']")].map((node) => node.textContent)
    expect(decorations).toEqual(["/"])
  })

  it("aligne à droite sans marque, et écarte les deux groupes avec", () => {
    const { container, unmount } = render(<SiteNav current="home" />)
    expect(container.querySelector("nav")).toHaveClass("justify-end")
    unmount()

    const withBrand = render(<SiteNav current="home" brand={<span>Damien Pasulj</span>} />)
    expect(withBrand.container.querySelector("nav")).toHaveClass("justify-between")
  })

  it("reporte la className sur le repère de navigation", () => {
    const { container } = render(<SiteNav current="home" className="mb-16" />)
    expect(container.querySelector("nav")).toHaveClass("mb-16")
  })

  it("traduit le lien et le libellé accessible en anglais", () => {
    renderWithLocale(<SiteNav current="home" />, "en")
    expect(screen.getByRole("navigation", { name: DICTIONARIES.en.common.navLabel })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: DICTIONARIES.en.common.navAbout })).toBeInTheDocument()
  })
})

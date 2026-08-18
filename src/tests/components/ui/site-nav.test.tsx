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

  it("garde le groupe de droite aligné même sans marque", () => {
    const { container } = render(<SiteNav current="about" />)
    // Un placeholder occupe la gauche pour que `justify-between` reste opérant.
    expect(container.querySelector("nav")?.firstElementChild?.tagName).toBe("SPAN")
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

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SiteNav } from "@/components/ui/site-nav"
import { renderWithLocale } from "@/tests/helpers/locale"
import { DICTIONARIES } from "@/constants/dictionary"

const trackEvent = vi.fn()

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))

const { common } = DICTIONARIES.fr

afterEach(() => {
  localStorage.clear()
})

describe("SiteNav", () => {
  it("expose un repère de navigation accessible", () => {
    render(<SiteNav current="home" />)
    expect(screen.getByRole("navigation", { name: common.navLabel })).toBeInTheDocument()
  })

  it("propose le dossier « à-propos/ » depuis l'accueil", () => {
    render(<SiteNav current="home" />)
    expect(screen.getByRole("link", { name: common.navAbout })).toHaveAttribute("href", "/about")
    expect(screen.queryByRole("link", { name: common.navChat })).not.toBeInTheDocument()
  })

  it("propose le dossier « conversation/ » depuis « à propos »", () => {
    render(<SiteNav current="about" />)
    expect(screen.getByRole("link", { name: common.navChat })).toHaveAttribute("href", "/")
    expect(screen.queryByRole("link", { name: common.navAbout })).not.toBeInTheDocument()
  })

  it("embarque le sélecteur de langue sur les deux routes", () => {
    const { unmount } = render(<SiteNav current="home" />)
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument()
    unmount()

    render(<SiteNav current="about" />)
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument()
  })

  it("affiche la marque fournie, à gauche des liens", () => {
    const { container } = render(<SiteNav current="about" brand={<span>accueil</span>} />)
    const nav = container.querySelector("nav")!
    expect(nav.firstElementChild).toHaveTextContent("accueil")
    expect(nav).toHaveClass("justify-between")
  })

  it("aligne à droite sans marque", () => {
    const { container } = render(<SiteNav current="home" />)
    expect(container.querySelector("nav")).toHaveClass("justify-end")
  })

  it("reporte la className sur le repère de navigation", () => {
    const { container } = render(<SiteNav current="home" className="fixed" />)
    expect(container.querySelector("nav")).toHaveClass("fixed")
  })

  it("traduit les dossiers et le libellé accessible en anglais", () => {
    const { unmount } = renderWithLocale(<SiteNav current="home" />, "en")
    expect(screen.getByRole("navigation", { name: DICTIONARIES.en.common.navLabel })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: DICTIONARIES.en.common.navAbout })).toBeInTheDocument()
    unmount()

    renderWithLocale(<SiteNav current="about" />, "en")
    expect(screen.getByRole("link", { name: DICTIONARIES.en.common.navChat })).toBeInTheDocument()
  })
})

describe("SiteNav : mesure d'audience", () => {
  beforeEach(() => {
    trackEvent.mockClear()
  })

  it("rattache le clic « à propos » au contexte d'affichage", async () => {
    const user = userEvent.setup()
    render(<SiteNav current="home" analyticsFrom="chat" />)

    await user.click(screen.getByRole("link", { name: common.navAbout }))

    expect(trackEvent).toHaveBeenCalledWith("about_link_clicked", { from: "chat" })
  })

  it("considère la landing comme contexte par défaut", async () => {
    const user = userEvent.setup()
    render(<SiteNav current="home" />)

    await user.click(screen.getByRole("link", { name: common.navAbout }))

    expect(trackEvent).toHaveBeenCalledWith("about_link_clicked", { from: "landing" })
  })

  it("consigne le retour vers la conversation depuis « à propos »", async () => {
    const user = userEvent.setup()
    render(<SiteNav current="about" analyticsFrom="about" />)

    await user.click(screen.getByRole("link", { name: common.navChat }))

    expect(trackEvent).toHaveBeenCalledWith("chat_link_clicked", { from: "about" })
  })
})

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AboutContent, PHOTO_START, framePhoto } from "@/components/features/about-content"
import { renderWithLocale } from "@/tests/helpers/locale"
import { DICTIONARIES } from "@/constants/dictionary"
import { EMAIL, GITHUB, LAST_UPDATED, LINKEDIN } from "@/constants/profile"
import { byteLength } from "@/lib/format"

const trackEvent = vi.fn()

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))

const { about, common, landing } = DICTIONARIES.fr

/** Boîte « fichier » dont l'en-tête porte ce nom. */
function fileBox(name: string): HTMLElement {
  return screen.getAllByTestId("file-box").find((box) => box.querySelector("p")?.textContent?.startsWith(name))!
}

afterEach(() => {
  localStorage.clear()
})

describe("AboutContent", () => {
  it("affiche le nom en bloc et l'intitulé du CV", () => {
    render(<AboutContent />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("damien pasulj")
    expect(screen.getByText(landing.role)).toBeInTheDocument()
  })

  it("présente le README avec sa taille calculée", () => {
    render(<AboutContent />)
    const readme = fileBox("README.md")
    expect(readme).toHaveTextContent(about.readme)
    expect(readme).toHaveTextContent(common.fileSize(byteLength(about.readme)))
  })

  it("fait défiler la photo entière dans son cadre, au clavier aussi", () => {
    render(<AboutContent />)
    const frame = screen.getByRole("region", { name: about.photoAlt })
    expect(frame).toHaveClass("overflow-y-auto")
    expect(frame).toHaveAttribute("tabindex", "0")
    expect(within(frame).getByRole("img", { name: about.photoAlt })).toHaveClass("h-auto")
    expect(fileBox("photo.jpg")).toHaveTextContent(about.photoScrollHint)
  })

  it("cadre la photo sur le visage : 35 % de la hauteur défilable", () => {
    const frame = document.createElement("div")
    Object.defineProperty(frame, "scrollHeight", { configurable: true, value: 780 })
    Object.defineProperty(frame, "clientHeight", { configurable: true, value: 300 })
    framePhoto(frame)
    expect(frame.scrollTop).toBeCloseTo((780 - 300) * PHOTO_START)
  })

  it("ignore un cadre absent", () => {
    expect(() => framePhoto(null)).not.toThrow()
  })

  it("donne les coordonnées publiques dans contact.vcf", () => {
    render(<AboutContent />)
    const contact = within(fileBox("contact.vcf"))
    for (const link of [EMAIL, GITHUB, LINKEDIN]) {
      expect(contact.getByRole("link", { name: link.label })).toHaveAttribute("href", link.href)
    }
    expect(contact.getByText(about.contactLocation)).toBeInTheDocument()
  })

  it("range les expériences et les projets dans des dossiers, avec leur décompte", () => {
    render(<AboutContent />)
    expect(screen.getByRole("heading", { level: 2, name: `${about.experienceDir} ${common.itemCount(3)}` })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: `${about.projectsDir} ${common.itemCount(3)}` })).toBeInTheDocument()
  })

  it("présente le parcours complet (Apizee, elloha) avec ses périodes", () => {
    render(<AboutContent />)
    for (const entry of about.experience) {
      const box = fileBox(entry.file)
      expect(box).toHaveTextContent(entry.role)
      expect(box).toHaveTextContent(entry.period)
    }
    expect(fileBox("apizee.md").querySelectorAll("li")).toHaveLength(3)
    expect(fileBox("elloha_web-front.md").querySelector("ul")).toBeNull()
  })

  it("relie chaque projet à son adresse publique", () => {
    render(<AboutContent />)
    for (const project of about.projects) {
      expect(screen.getByRole("link", { name: project.file })).toHaveAttribute("href", project.href)
    }
  })

  it("barre les tâches faites du todo.md et garde la dernière ouverte, sur l'aplat teal", () => {
    render(<AboutContent />)
    const todo = fileBox("todo.md")
    expect(todo).toHaveAttribute("data-tone", "accent")
    const items = todo.querySelectorAll("li")
    expect(items).toHaveLength(about.todoDone.length + 1)
    expect(items[0]).toHaveClass("line-through")
    expect(items[items.length - 1]).toHaveTextContent(about.todoOpen)
    expect(items[items.length - 1]).not.toHaveClass("line-through")
  })

  it("n'affiche plus de bloc de compétences : le double IA y répond", () => {
    render(<AboutContent />)
    expect(screen.queryByText("skills.json")).not.toBeInTheDocument()
    expect(screen.queryByText("Qdrant")).not.toBeInTheDocument()
  })

  it("liste les fichiers hors écran et la formation", () => {
    render(<AboutContent />)
    for (const file of about.offscreen) {
      expect(within(fileBox(about.offscreenDir)).getByText(file)).toBeInTheDocument()
    }
    expect(fileBox(about.educationFile)).toHaveTextContent(about.education)
  })

  it("propose deux chemins vers la conversation et date la dernière mise à jour", () => {
    render(<AboutContent />)
    expect(screen.getByRole("link", { name: common.navChat })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: new RegExp(about.ctaLink) })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: common.navHome })).toHaveAttribute("href", "/")
    expect(screen.getByText(LAST_UPDATED)).toBeInTheDocument()
  })

  describe("Traduction", () => {
    it("traduit les fichiers, les dossiers et l'appel à l'action", () => {
      renderWithLocale(<AboutContent />, "en")
      const en = DICTIONARIES.en.about
      expect(screen.getByText(en.readme)).toBeInTheDocument()
      expect(screen.getByText(en.storyFile)).toBeInTheDocument()
      expect(screen.getByText(en.experienceDir)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: new RegExp(en.ctaLink) })).toBeInTheDocument()
      expect(screen.getAllByText(/\(\d+ B\)/).length).toBeGreaterThan(0)
    })

    it("conserve les noms propres (entreprises)", () => {
      renderWithLocale(<AboutContent />, "en")
      expect(screen.getAllByText(/Apizee/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/elloha/).length).toBeGreaterThan(0)
    })
  })
})

describe("AboutContent : mesure d'audience", () => {
  beforeEach(() => {
    trackEvent.mockClear()
  })

  it("consigne le clic sur l'appel à l'action final", async () => {
    const user = userEvent.setup()
    render(<AboutContent />)

    await user.click(screen.getByRole("link", { name: new RegExp(about.ctaLink) }))

    expect(trackEvent).toHaveBeenCalledWith("about_cta_clicked")
  })
})

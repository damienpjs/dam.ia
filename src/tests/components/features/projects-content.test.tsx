import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProjectsContent } from "@/components/features/projects-content"
import { renderWithLocale } from "@/tests/helpers/locale"
import { DICTIONARIES } from "@/constants/dictionary"
import { byteLength, sizeOf } from "@/lib/format"

const trackEvent = vi.fn()

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))

const { projects, common, landing } = DICTIONARIES.fr
const [hodl, komfy] = projects.entries

/** Boîte « fichier » dont l'en-tête porte ce nom. */
function fileBox(name: string): HTMLElement {
  return screen.getAllByTestId("file-box").find((box) => box.querySelector("p")?.textContent?.startsWith(name))!
}

afterEach(() => {
  localStorage.clear()
})

describe("ProjectsContent", () => {
  it("affiche le titre en bloc et l'intitulé du CV", () => {
    render(<ProjectsContent />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(projects.title)
    expect(screen.getByText(landing.role)).toBeInTheDocument()
  })

  it("présente le README avec sa taille calculée", () => {
    render(<ProjectsContent />)
    const readme = fileBox("README.md")
    expect(readme).toHaveTextContent(projects.readme)
    expect(readme).toHaveTextContent(common.fileSize(byteLength(projects.readme)))
  })

  it("numérote les projets dans l'index et renvoie vers leur fiche", () => {
    render(<ProjectsContent />)
    const index = within(fileBox(projects.indexFile))
    expect(fileBox(projects.indexFile)).toHaveTextContent(common.itemCount(projects.entries.length))
    expect(index.getByRole("link", { name: `01 ${hodl.name}` })).toHaveAttribute("href", `#${hodl.id}`)
    expect(index.getByRole("link", { name: `02 ${komfy.name}` })).toHaveAttribute("href", `#${komfy.id}`)
  })

  it("range les fiches dans le dossier « projets/ », avec leur décompte", () => {
    render(<ProjectsContent />)
    expect(screen.getByRole("heading", { level: 2, name: `${projects.projectsDir} ${common.itemCount(2)}` })).toBeInTheDocument()
  })

  it("donne à chaque fiche son ancre, son nom, son poids et ses points clés", () => {
    render(<ProjectsContent />)
    for (const project of projects.entries) {
      const article = screen.getByRole("article", { name: project.name })
      expect(article).toHaveAttribute("id", project.id)
      expect(article).toHaveTextContent(common.fileSize(sizeOf(project.name, project.tags, project.summary, ...project.bullets)))
      expect(within(article).getByText(project.summary)).toBeInTheDocument()
      expect(within(article).getAllByRole("listitem")).toHaveLength(project.bullets.length + project.stack.length)
    }
  })

  it("décale la seconde fiche d'une colonne", () => {
    render(<ProjectsContent />)
    expect(screen.getByRole("article", { name: hodl.name })).toHaveClass("lg:col-span-11")
    expect(screen.getByRole("article", { name: komfy.name })).toHaveClass("lg:col-start-2")
  })

  it("relie l'adresse et l'action de chaque fiche au projet, dans un nouvel onglet", () => {
    render(<ProjectsContent />)
    for (const project of projects.entries) {
      const article = within(screen.getByRole("article", { name: project.name }))
      for (const name of [project.file, new RegExp(project.action)]) {
        const link = article.getByRole("link", { name })
        expect(link).toHaveAttribute("href", project.href)
        expect(link).toHaveAttribute("target", "_blank")
      }
    }
  })

  it("affiche la bannière avec sa légende de fichier", () => {
    render(<ProjectsContent />)
    const banner = hodl.banner!
    const article = within(screen.getByRole("article", { name: hodl.name }))
    expect(article.getByRole("img", { name: banner.alt })).toBeInTheDocument()
    const caption = article.getByText(banner.file).closest("figcaption")!
    expect(caption).toHaveTextContent(common.fileSize(banner.bytes))
    expect(caption).toHaveTextContent(`${banner.width} × ${banner.height}`)
    expect(caption).toHaveTextContent(banner.caption)
  })

  it("passe directement au texte quand un projet n'a pas de bannière", () => {
    render(<ProjectsContent />)
    const article = screen.getByRole("article", { name: komfy.name })
    expect(komfy.banner).toBeUndefined()
    expect(article.querySelector("figure")).toBeNull()
  })

  it("montre la stack de chaque projet avec son poids", () => {
    render(<ProjectsContent />)
    for (const project of projects.entries) {
      const article = within(screen.getByRole("article", { name: project.name }))
      const stack = article.getByText(projects.stackFile).parentElement!
      expect(stack).toHaveTextContent(common.fileSize(sizeOf(...project.stack)))
      for (const item of project.stack) {
        expect(article.getByText(item)).toBeInTheDocument()
      }
    }
  })

  it("propose de revenir à l'accueil et vers la conversation", () => {
    render(<ProjectsContent />)
    expect(screen.getByRole("link", { name: common.navHome })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: common.navChat })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: common.navAbout })).toHaveAttribute("href", "/about")
    expect(screen.queryByRole("link", { name: common.navProjects })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: new RegExp(projects.ctaLink) })).toHaveAttribute("href", "/")
  })

  describe("Traduction", () => {
    it("traduit le titre, les fichiers, les fiches et l'appel à l'action", () => {
      renderWithLocale(<ProjectsContent />, "en")
      const en = DICTIONARIES.en.projects
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.title)
      expect(screen.getByText(en.readme)).toBeInTheDocument()
      expect(screen.getByText(en.projectsDir)).toBeInTheDocument()
      expect(screen.getByText(en.entries[0].summary)).toBeInTheDocument()
      expect(screen.getByRole("img", { name: en.entries[0].banner!.alt })).toBeInTheDocument()
      expect(screen.getByRole("link", { name: new RegExp(en.ctaLink) })).toBeInTheDocument()
      expect(screen.getAllByText(/\(\d+ B\)/).length).toBeGreaterThan(0)
    })
  })
})

describe("ProjectsContent : mesure d'audience", () => {
  beforeEach(() => {
    trackEvent.mockClear()
  })

  it("consigne le clic sur l'action d'un projet, avec son identifiant", async () => {
    const user = userEvent.setup()
    render(<ProjectsContent />)

    await user.click(screen.getByRole("link", { name: new RegExp(komfy.action) }))

    expect(trackEvent).toHaveBeenCalledWith("project_link_clicked", { project: komfy.id })
  })

  it("consigne le clic sur l'appel à l'action final", async () => {
    const user = userEvent.setup()
    render(<ProjectsContent />)

    await user.click(screen.getByRole("link", { name: new RegExp(projects.ctaLink) }))

    expect(trackEvent).toHaveBeenCalledWith("projects_cta_clicked")
  })

  it("rattache la navigation au contexte « projets »", async () => {
    const user = userEvent.setup()
    render(<ProjectsContent />)

    await user.click(screen.getByRole("link", { name: common.navAbout }))

    expect(trackEvent).toHaveBeenCalledWith("about_link_clicked", { from: "projects" })
  })
})

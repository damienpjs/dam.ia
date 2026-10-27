import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Home from "@/app/page"
import { renderWithLocale } from "@/tests/helpers/locale"
import { DICTIONARIES } from "@/constants/dictionary"
import { CV, GITHUB, LINKEDIN } from "@/constants/profile"

const heroScene = vi.fn()

vi.mock("@/components/features/hero-scene", () => ({
  HeroScene: (props: { bubblesEnabled?: boolean; layout?: string }) => {
    heroScene(props)
    return <div data-testid="hero-scene" data-layout={props.layout} data-bubbles={String(props.bubblesEnabled)} />
  },
}))

vi.mock("@/components/features/chat-interface", () => ({
  ChatInterface: ({ messagesVisible, onTurnsChange }: { messagesVisible?: boolean; onTurnsChange?: (turns: number) => void }) => (
    <div data-testid="chat-interface" data-messages-visible={String(messagesVisible)}>
      <button type="button" data-testid="simuler-echange" onClick={() => onTurnsChange?.(4)}>
        échange
      </button>
    </div>
  ),
}))

const trackEvent = vi.fn()

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))

const { landing, chat, common } = DICTIONARIES.fr

// Force des dimensions non nulles pour exercer le morph (jsdom renvoie 0 par défaut)
function stubLayout() {
  const rect = { top: 100, left: 0, right: 300, bottom: 150, width: 300, height: 50, x: 0, y: 100, toJSON: () => ({}) } as DOMRect
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect)
}

function openButton() {
  return screen.getByRole("button", { name: landing.startConversationAria })
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe("Page d'accueil (/)", () => {
  it("affiche le nom en bloc et l'intitulé du CV", () => {
    render(<Home />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("damien pasulj")
    expect(screen.getByText(landing.role)).toBeInTheDocument()
  })

  it("présente le message d'accueil comme le README.md, avec sa taille réelle", () => {
    render(<Home />)
    const readme = within(openButton())
    expect(readme.getByText(chat.welcomeFile)).toBeInTheDocument()
    expect(readme.getByTestId("readme-content")).toHaveTextContent(chat.welcome)
    expect(readme.getByText(/\(\d+ o\)/)).toBeInTheDocument()
  })

  it("n'affiche plus de vignettes de technos", () => {
    render(<Home />)
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument()
    expect(screen.queryByText("Qdrant")).not.toBeInTheDocument()
  })

  it("propose le CV et les profils en pied de page", () => {
    render(<Home />)
    expect(screen.getByRole("link", { name: CV.label })).toHaveAttribute("href", CV.href)
    expect(screen.getByRole("link", { name: GITHUB.label })).toHaveAttribute("href", GITHUB.href)
    expect(screen.getByRole("link", { name: LINKEDIN.label })).toHaveAttribute("href", LINKEDIN.href)
    expect(screen.getByText(landing.orbitHint)).toBeInTheDocument()
  })

  it("rend la hero scene 3D cadrée pour l'accueil, bulles actives", () => {
    render(<Home />)
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-layout", "landing")
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-bubbles", "true")
  })

  it("ouvre le panneau de conversation au clic sur le README et recadre la scène", async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(openButton())
    expect(screen.getByTestId("chat-interface")).toBeInTheDocument()
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-layout", "chat")
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-bubbles", "false")
  })

  it("affiche le dossier de conversation et son nombre de messages", async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(openButton())
    expect(screen.getByText(chat.conversationDir)).toBeInTheDocument()
    expect(screen.getByText(chat.messageCount(0))).toBeInTheDocument()

    await user.click(screen.getByTestId("simuler-echange"))
    expect(screen.getByText(chat.messageCount(4))).toBeInTheDocument()
  })

  it("ferme le panneau au clic sur le nom", async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(openButton())
    await user.click(screen.getByRole("button", { name: /damien pasulj/i }))
    expect(openButton()).toBeInTheDocument()
    expect(screen.getByTestId("hero-scene")).toHaveAttribute("data-layout", "landing")
  })

  it("rend inerte la vue masquée (landing pendant le chat, et inversement)", async () => {
    const user = userEvent.setup()
    const { container } = render(<Home />)
    const inertBefore = container.querySelectorAll("[inert]")
    expect(inertBefore).toHaveLength(1)
    expect(inertBefore[0]).toContainElement(screen.getByRole("button", { name: /damien pasulj/i, hidden: true }))

    await user.click(openButton())
    const inertAfter = container.querySelectorAll("[inert]")
    expect(inertAfter).toHaveLength(1)
    expect(inertAfter[0]).toContainElement(screen.getByRole("button", { name: landing.startConversationAria, hidden: true }))
  })

  it("fait glisser le README vers le haut du chat puis révèle les messages", async () => {
    stubLayout()
    const user = userEvent.setup()
    render(<Home />)

    await user.click(openButton())

    // Pendant le morph : le clone est présent et la liste des messages est masquée
    const clone = screen.getByTestId("welcome-clone")
    expect(clone).toHaveTextContent(chat.welcome)
    expect(screen.getByTestId("chat-interface")).toHaveAttribute("data-messages-visible", "false")

    // Fin de la transition : le clone disparaît, les messages deviennent visibles
    fireEvent.transitionEnd(clone)
    expect(screen.queryByTestId("welcome-clone")).not.toBeInTheDocument()
    expect(screen.getByTestId("chat-interface")).toHaveAttribute("data-messages-visible", "true")
  })

  it("réinitialise le morph à la fermeture pendant la transition", async () => {
    stubLayout()
    const user = userEvent.setup()
    render(<Home />)

    await user.click(openButton())
    expect(screen.getByTestId("welcome-clone")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /damien pasulj/i }))
    expect(screen.queryByTestId("welcome-clone")).not.toBeInTheDocument()
    expect(openButton()).toBeInTheDocument()
  })

  describe("Navigation et langue", () => {
    it("n'a qu'une barre de navigation, partagée par la landing et le chat", () => {
      render(<Home />)
      const nav = screen.getByRole("navigation", { name: common.navLabel })
      expect(within(nav).getByRole("link", { name: common.navAbout })).toHaveAttribute("href", "/about")
      expect(screen.getAllByTestId("language-switcher")).toHaveLength(1)
    })

    it("traduit l'intitulé, le README et le CTA en anglais", () => {
      renderWithLocale(<Home />, "en")
      const en = DICTIONARIES.en
      expect(screen.getByText(en.landing.role)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: en.landing.startConversationAria })).toHaveTextContent(en.landing.startConversation)
      expect(screen.getByTestId("readme-content")).toHaveTextContent(en.chat.welcome)
      expect(screen.getByText(/\(\d+ KB\)/)).toBeInTheDocument()
    })

    it("bascule le contenu au clic sur EN", async () => {
      const user = userEvent.setup()
      renderWithLocale(<Home />, "fr")

      expect(screen.getByText(landing.role)).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: common.localeNames.en }))

      expect(screen.getByText(DICTIONARIES.en.landing.role)).toBeInTheDocument()
      expect(localStorage.getItem("dam_ia_locale")).toBe("en")
    })
  })
})

describe("Page d'accueil : mesure d'audience", () => {
  beforeEach(() => {
    trackEvent.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("consigne l'ouverture de la conversation", async () => {
    const user = userEvent.setup()
    render(<Home />)

    await user.click(openButton())

    expect(trackEvent).toHaveBeenCalledWith("chat_opened")
  })

  it("consigne la fermeture avec le nombre de messages échangés", async () => {
    const user = userEvent.setup()
    render(<Home />)

    await user.click(openButton())
    await user.click(screen.getByTestId("simuler-echange"))
    await user.click(screen.getByRole("button", { name: /damien pasulj/i }))

    expect(trackEvent).toHaveBeenCalledWith("chat_closed", { turns: 4 })
  })

  it("consigne le clic sur un lien de profil, par son libellé", async () => {
    const user = userEvent.setup()
    render(<Home />)

    await user.click(screen.getByRole("link", { name: CV.label }))

    expect(trackEvent).toHaveBeenCalledWith("profile_link_clicked", { link: CV.label })
  })

  it("distingue le contexte du clic sur « à propos » (landing ou chat)", async () => {
    const user = userEvent.setup()
    render(<Home />)

    await user.click(screen.getByRole("link", { name: common.navAbout }))
    expect(trackEvent).toHaveBeenLastCalledWith("about_link_clicked", { from: "landing" })

    await user.click(openButton())
    await user.click(screen.getByRole("link", { name: common.navAbout }))
    expect(trackEvent).toHaveBeenLastCalledWith("about_link_clicked", { from: "chat" })
  })
})

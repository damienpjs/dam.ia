import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MessageBubble, type IMessage } from "@/components/features/message-bubble"

const userMessage: IMessage = {
  id: "1",
  role: "user",
  content: "Bonjour, comment ça va ?",
  createdAt: new Date("2024-01-01T10:00:00"),
}

const assistantMessage: IMessage = {
  id: "2",
  role: "assistant",
  content: "Salut ! Je vais bien, merci.",
  createdAt: new Date("2024-01-01T10:00:01"),
}

describe("MessageBubble", () => {
  it("affiche le contenu du message utilisateur", () => {
    render(<MessageBubble message={userMessage} />)
    expect(screen.getByText("Bonjour, comment ça va ?")).toBeInTheDocument()
  })

  it("affiche le contenu du message assistant", () => {
    render(<MessageBubble message={assistantMessage} />)
    expect(screen.getByText("Salut ! Je vais bien, merci.")).toBeInTheDocument()
  })

  it("aligne le message utilisateur à droite (flex-row-reverse)", () => {
    const { container } = render(<MessageBubble message={userMessage} />)
    const wrapper = container.querySelector("[data-testid='message-bubble']")
    expect(wrapper).toHaveClass("flex-row-reverse")
  })

  it("aligne le message assistant à gauche (flex-row)", () => {
    const { container } = render(<MessageBubble message={assistantMessage} />)
    const wrapper = container.querySelector("[data-testid='message-bubble']")
    expect(wrapper).toHaveClass("flex-row")
  })

  it("applique le style bulle semi-transparent pour les messages utilisateur", () => {
    render(<MessageBubble message={userMessage} />)
    const bubble = screen.getByText("Bonjour, comment ça va ?")
    expect(bubble).toHaveClass("text-[#F9B288]")
  })

  it("applique le style carte pour les messages assistant", () => {
    render(<MessageBubble message={assistantMessage} />)
    const bubble = screen.getByText("Salut ! Je vais bien, merci.")
    expect(bubble).toHaveClass("bg-card")
  })

  it("rend l'avatar emoji pour les messages utilisateur", () => {
    const { container } = render(<MessageBubble message={userMessage} />)
    const avatar = container.querySelector("[aria-hidden='true']")
    expect(avatar).toHaveTextContent("🫵")
  })

  it("rend l'image d'avatar pour les messages assistant", () => {
    const { container } = render(<MessageBubble message={assistantMessage} />)
    const avatarImg = container.querySelector("[aria-hidden='true'] img")
    expect(avatarImg).toBeInTheDocument()
    expect(avatarImg).toHaveAttribute("src")
  })

  it("applique le gradient peach sur l'avatar assistant", () => {
    const { container } = render(<MessageBubble message={assistantMessage} />)
    const avatar = container.querySelector("[aria-hidden='true']")
    expect(avatar).toHaveClass("from-[#E8A070]")
  })

  it("affiche le skeleton quand le message assistant est vide et en streaming", () => {
    const emptyMessage: IMessage = { id: "3", role: "assistant", content: "", createdAt: new Date() }
    render(<MessageBubble message={emptyMessage} isStreaming />)
    expect(screen.getByTestId("streaming-skeleton")).toBeInTheDocument()
  })

  it("donne au skeleton la même largeur que la largeur max des messages texte (75%)", () => {
    const emptyMessage: IMessage = { id: "3", role: "assistant", content: "", createdAt: new Date() }
    render(<MessageBubble message={emptyMessage} isStreaming />)
    const skeletonWrapper = screen.getByTestId("streaming-skeleton").parentElement?.parentElement
    expect(skeletonWrapper).toHaveClass("w-[75%]")
  })

  it("n'affiche pas le skeleton pour un message assistant avec du contenu en streaming", () => {
    render(<MessageBubble message={assistantMessage} isStreaming />)
    expect(screen.queryByTestId("streaming-skeleton")).not.toBeInTheDocument()
  })

  it("affiche le curseur clignotant pendant le streaming avec du contenu", () => {
    render(<MessageBubble message={assistantMessage} isStreaming />)
    expect(screen.getByTestId("streaming-cursor")).toBeInTheDocument()
  })

  it("n'affiche pas le curseur quand le streaming est terminé", () => {
    render(<MessageBubble message={assistantMessage} />)
    expect(screen.queryByTestId("streaming-cursor")).not.toBeInTheDocument()
  })

  it("n'affiche pas le skeleton pour un message utilisateur vide en streaming", () => {
    const emptyUserMsg: IMessage = { id: "4", role: "user", content: "", createdAt: new Date() }
    render(<MessageBubble message={emptyUserMsg} isStreaming />)
    expect(screen.queryByTestId("streaming-skeleton")).not.toBeInTheDocument()
  })

  it("affiche les sources RAG quand elles sont présentes", () => {
    const messageWithSources: IMessage = {
      id: "5",
      role: "assistant",
      content: "Voici mes compétences.",
      createdAt: new Date(),
      sources: [
        { label: "CV (PDF)", source: "cv", url: "/cv-damien-pasulj.pdf" },
        { label: "LinkedIn", source: "linkedin", url: "https://www.linkedin.com/in/music-all/" },
      ],
    }
    render(<MessageBubble message={messageWithSources} />)
    expect(screen.getByTestId("message-sources")).toBeInTheDocument()
    expect(screen.getByText("CV (PDF)")).toBeInTheDocument()
    expect(screen.getByText("LinkedIn")).toBeInTheDocument()

    // Sources avec url sont des liens cliquables
    const cvLink = screen.getByText("CV (PDF)").closest("a")
    expect(cvLink).toHaveAttribute("href", "/cv-damien-pasulj.pdf")
    const linkedinLink = screen.getByText("LinkedIn").closest("a")
    expect(linkedinLink).toHaveAttribute("href", "https://www.linkedin.com/in/music-all/")
  })

  it("n'affiche pas les sources pendant le streaming", () => {
    const messageWithSources: IMessage = {
      id: "6",
      role: "assistant",
      content: "En cours...",
      createdAt: new Date(),
      sources: [{ label: "CV (PDF)", source: "cv", url: "/cv-damien-pasulj.pdf" }],
    }
    render(<MessageBubble message={messageWithSources} isStreaming />)
    expect(screen.queryByTestId("message-sources")).not.toBeInTheDocument()
  })

  it("n'affiche pas les sources pour les messages utilisateur", () => {
    const userWithSources: IMessage = {
      id: "7",
      role: "user",
      content: "Question",
      createdAt: new Date(),
      sources: [{ label: "CV (PDF)", source: "cv", url: "/cv-damien-pasulj.pdf" }],
    }
    render(<MessageBubble message={userWithSources} />)
    expect(screen.queryByTestId("message-sources")).not.toBeInTheDocument()
  })

  it("n'affiche pas les sources si le tableau est vide", () => {
    const messageNoSources: IMessage = {
      id: "8",
      role: "assistant",
      content: "Sans sources.",
      createdAt: new Date(),
      sources: [],
    }
    render(<MessageBubble message={messageNoSources} />)
    expect(screen.queryByTestId("message-sources")).not.toBeInTheDocument()
  })

  it("affiche les sources sans url comme des spans non-cliquables", () => {
    const messageWithPlainSource: IMessage = {
      id: "9b",
      role: "assistant",
      content: "Contenu sans lien.",
      createdAt: new Date(),
      sources: [{ label: "Source interne", source: "interne" }],
    }
    render(<MessageBubble message={messageWithPlainSource} />)
    const el = screen.getByText("Source interne")
    expect(el.tagName).toBe("SPAN")
  })

  describe("bouton copier", () => {
    it("affiche le bouton copier pour un message avec du contenu", () => {
      render(<MessageBubble message={assistantMessage} />)
      expect(screen.getByTestId("copy-button")).toBeInTheDocument()
      expect(screen.getByTestId("copy-icon")).toBeInTheDocument()
    })

    it("affiche le bouton copier pour un message utilisateur", () => {
      render(<MessageBubble message={userMessage} />)
      expect(screen.getByTestId("copy-button")).toBeInTheDocument()
    })

    it("n'affiche pas le bouton copier pendant le streaming", () => {
      render(<MessageBubble message={assistantMessage} isStreaming />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("n'affiche pas le bouton copier si le message est vide", () => {
      const emptyMessage: IMessage = { id: "9", role: "assistant", content: "", createdAt: new Date() }
      render(<MessageBubble message={emptyMessage} />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("copie le contenu du message dans le presse-papiers au clic", () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      render(<MessageBubble message={assistantMessage} />)
      fireEvent.click(screen.getByTestId("copy-button"))
      expect(writeText).toHaveBeenCalledWith("Salut ! Je vais bien, merci.")
    })

    it("affiche l'icône check après copie", () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      render(<MessageBubble message={assistantMessage} />)
      fireEvent.click(screen.getByTestId("copy-button"))
      expect(screen.getByTestId("check-icon")).toBeInTheDocument()
      expect(screen.queryByTestId("copy-icon")).not.toBeInTheDocument()
    })

    it("a l'aria-label 'Copier le message' par défaut", () => {
      render(<MessageBubble message={assistantMessage} />)
      expect(screen.getByTestId("copy-button")).toHaveAttribute("aria-label", "Copier le message")
    })

    it("change l'aria-label en 'Copié' après copie", () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      render(<MessageBubble message={assistantMessage} />)
      fireEvent.click(screen.getByTestId("copy-button"))
      expect(screen.getByTestId("copy-button")).toHaveAttribute("aria-label", "Copié")
    })

    it("rend le bouton visible quand on clique sur la bulle (mobile)", () => {
      render(<MessageBubble message={assistantMessage} />)
      const bubble = screen.getByTestId("message-bubble")
      const copyButton = screen.getByTestId("copy-button")

      expect(copyButton).toHaveClass("opacity-0")
      fireEvent.click(bubble)
      expect(copyButton).toHaveClass("opacity-100")
    })

    it("masque le bouton quand on re-clique sur la bulle (toggle)", () => {
      render(<MessageBubble message={assistantMessage} />)
      const bubble = screen.getByTestId("message-bubble")
      const copyButton = screen.getByTestId("copy-button")

      fireEvent.click(bubble)
      expect(copyButton).toHaveClass("opacity-100")
      fireEvent.click(bubble)
      expect(copyButton).toHaveClass("opacity-0")
    })

    it("ne révèle le bouton au survol que sur les appareils à pointeur fin (évite le hover persistant sur tactile)", () => {
      render(<MessageBubble message={assistantMessage} />)
      const copyButton = screen.getByTestId("copy-button")

      // Le hover CSS est conditionné par (hover:hover) and (pointer:fine) :
      // sur tactile, seul l'état `tapped` contrôle la visibilité, garantissant le masquage.
      expect(copyButton).toHaveClass("[@media(hover:hover)_and_(pointer:fine)]:group-hover/bubble:opacity-100")
      expect(copyButton).not.toHaveClass("group-hover/bubble:opacity-100")
    })

    it("masque le bouton quand on clique en dehors de la bulle", () => {
      render(<MessageBubble message={assistantMessage} />)
      const bubble = screen.getByTestId("message-bubble")
      const copyButton = screen.getByTestId("copy-button")

      fireEvent.click(bubble)
      expect(copyButton).toHaveClass("opacity-100")
      fireEvent.pointerDown(document.body)
      expect(copyButton).toHaveClass("opacity-0")
    })

    it("ne masque pas le bouton quand on clique sur le bouton copier", () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      render(<MessageBubble message={assistantMessage} />)
      const bubble = screen.getByTestId("message-bubble")
      const copyButton = screen.getByTestId("copy-button")

      fireEvent.click(bubble)
      expect(copyButton).toHaveClass("opacity-100")
      fireEvent.click(copyButton)
      expect(copyButton).toHaveClass("opacity-100")
    })
  })

  describe("bouton réutiliser", () => {
    it("n'affiche pas le bouton réutiliser sans la prop onReuse", () => {
      render(<MessageBubble message={userMessage} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("n'affiche pas le bouton réutiliser pour un message assistant même avec onReuse", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={assistantMessage} onReuse={onReuse} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("affiche le bouton réutiliser pour un message utilisateur avec onReuse", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={userMessage} onReuse={onReuse} />)
      expect(screen.getByTestId("reuse-button")).toBeInTheDocument()
      expect(screen.getByTestId("reuse-icon")).toBeInTheDocument()
    })

    it("n'affiche pas le bouton réutiliser pendant le streaming", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={userMessage} isStreaming onReuse={onReuse} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("n'affiche pas le bouton réutiliser si le message est vide", () => {
      const onReuse = vi.fn()
      const emptyUserMsg: IMessage = { id: "10", role: "user", content: "", createdAt: new Date() }
      render(<MessageBubble message={emptyUserMsg} onReuse={onReuse} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("appelle onReuse avec le contenu du message au clic", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={userMessage} onReuse={onReuse} />)
      fireEvent.click(screen.getByTestId("reuse-button"))
      expect(onReuse).toHaveBeenCalledWith("Bonjour, comment ça va ?")
    })

    it("a l'aria-label 'Remettre dans le tchat'", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={userMessage} onReuse={onReuse} />)
      expect(screen.getByTestId("reuse-button")).toHaveAttribute("aria-label", "Remettre dans le tchat")
    })

    it("est visible quand la bulle est tappée (mobile)", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={userMessage} onReuse={onReuse} />)
      const bubble = screen.getByTestId("message-bubble")
      const reuseButton = screen.getByTestId("reuse-button")

      expect(reuseButton).toHaveClass("opacity-0")
      fireEvent.click(bubble)
      expect(reuseButton).toHaveClass("opacity-100")
    })
  })

  describe("showActions", () => {
    it("masque le bouton copier quand showActions est false", () => {
      render(<MessageBubble message={assistantMessage} showActions={false} />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("masque le bouton réutiliser quand showActions est false", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={userMessage} onReuse={onReuse} showActions={false} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("affiche toujours le contenu du message quand showActions est false", () => {
      render(<MessageBubble message={assistantMessage} showActions={false} />)
      expect(screen.getByText("Salut ! Je vais bien, merci.")).toBeInTheDocument()
    })
  })

  describe("statut d'erreur", () => {
    const errorMessage: IMessage = {
      id: "err",
      role: "assistant",
      content: "⚠️ Une erreur est survenue. Réessaie dans un instant.",
      status: "error",
      createdAt: new Date("2024-01-01T10:00:02"),
    }

    it("applique le style d'erreur à une réponse assistant en échec", () => {
      render(<MessageBubble message={errorMessage} />)
      expect(screen.getByTestId("message-bubble-error")).toBeInTheDocument()
      expect(screen.getByTestId("message-bubble-error")).toHaveClass("text-destructive")
    })

    it("masque le bouton copier sur une bulle d'erreur", () => {
      render(<MessageBubble message={errorMessage} />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("n'applique pas le style d'erreur à un message assistant normal", () => {
      render(<MessageBubble message={assistantMessage} />)
      expect(screen.queryByTestId("message-bubble-error")).not.toBeInTheDocument()
    })

    it("ignore le statut error sur un message utilisateur", () => {
      render(<MessageBubble message={{ ...userMessage, status: "error" }} />)
      expect(screen.queryByTestId("message-bubble-error")).not.toBeInTheDocument()
    })
  })
})

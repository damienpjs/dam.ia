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

  it("rend l'avatar 'DP' pour les messages assistant", () => {
    const { container } = render(<MessageBubble message={assistantMessage} />)
    const avatar = container.querySelector("[aria-hidden='true']")
    expect(avatar).toHaveTextContent("DP")
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
        { label: "Compétences Techniques", source: "competences-techniques" },
        { label: "CV", source: "cv" },
      ],
    }
    render(<MessageBubble message={messageWithSources} />)
    expect(screen.getByTestId("message-sources")).toBeInTheDocument()
    expect(screen.getByText("Compétences Techniques")).toBeInTheDocument()
    expect(screen.getByText("CV")).toBeInTheDocument()
  })

  it("n'affiche pas les sources pendant le streaming", () => {
    const messageWithSources: IMessage = {
      id: "6",
      role: "assistant",
      content: "En cours...",
      createdAt: new Date(),
      sources: [{ label: "CV", source: "cv" }],
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
      sources: [{ label: "CV", source: "cv" }],
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
  })
})

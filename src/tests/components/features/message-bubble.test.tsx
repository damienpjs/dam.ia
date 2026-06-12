import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
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

  it("applique le style bulle gradient pour les messages utilisateur", () => {
    render(<MessageBubble message={userMessage} />)
    const bubble = screen.getByText("Bonjour, comment ça va ?")
    expect(bubble).toHaveClass("from-violet-600")
  })

  it("applique le style carte pour les messages assistant", () => {
    render(<MessageBubble message={assistantMessage} />)
    const bubble = screen.getByText("Salut ! Je vais bien, merci.")
    expect(bubble).toHaveClass("bg-card")
  })

  it("rend l'avatar 'T' pour les messages utilisateur", () => {
    const { container } = render(<MessageBubble message={userMessage} />)
    const avatar = container.querySelector("[aria-hidden='true']")
    expect(avatar).toHaveTextContent("T")
  })

  it("rend l'avatar 'AI' pour les messages assistant", () => {
    const { container } = render(<MessageBubble message={assistantMessage} />)
    const avatar = container.querySelector("[aria-hidden='true']")
    expect(avatar).toHaveTextContent("AI")
  })

  it("applique le gradient violet-orange sur l'avatar assistant", () => {
    const { container } = render(<MessageBubble message={assistantMessage} />)
    const avatar = container.querySelector("[aria-hidden='true']")
    expect(avatar).toHaveClass("from-violet-500")
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
})

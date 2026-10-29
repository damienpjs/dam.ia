import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { MessageBubble, type IMessage } from "@/components/features/message-bubble"
import { WELCOME_MESSAGE_ID } from "@/constants/chat"
import { ASSISTANT_NAME } from "@/constants/profile"
import { DICTIONARIES } from "@/constants/dictionary"

const trackEvent = vi.fn()

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}))

const { chat } = DICTIONARIES.fr

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
  createdAt: new Date("2024-01-01T10:07:00"),
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

  it("préfixe la question du visiteur d'un chevron, comme une ligne de terminal", () => {
    render(<MessageBubble message={userMessage} />)
    const bubble = screen.getByTestId("message-bubble")
    expect(bubble).toHaveAttribute("data-role", "user")
    expect(bubble.textContent?.startsWith(">")).toBe(true)
  })

  it("signe la réponse du nom du double IA et de son heure", () => {
    render(<MessageBubble message={assistantMessage} />)
    expect(screen.getByTestId("message-bubble")).toHaveAttribute("data-role", "assistant")
    expect(screen.getByText(ASSISTANT_NAME)).toBeInTheDocument()
    expect(screen.getByText("10:07")).toBeInTheDocument()
  })

  it("accepte une date sérialisée (session restaurée)", () => {
    render(<MessageBubble message={{ ...assistantMessage, createdAt: "2024-01-01T10:07:00" as unknown as Date }} />)
    expect(screen.getByText("10:07")).toBeInTheDocument()
  })

  it("rend le message d'accueil comme le README du CV", () => {
    render(<MessageBubble message={{ id: WELCOME_MESSAGE_ID, role: "assistant", content: chat.welcome, createdAt: new Date() }} />)
    expect(screen.getByText(chat.welcomeFile)).toBeInTheDocument()
    expect(screen.getByTestId("readme-content")).toHaveTextContent(chat.welcome)
    expect(screen.queryByText(ASSISTANT_NAME)).not.toBeInTheDocument()
  })

  it("affiche la phrase de réflexion quand le message assistant est vide et en streaming", () => {
    render(<MessageBubble message={{ ...assistantMessage, content: "" }} isStreaming />)
    expect(screen.getByTestId("thinking-phrase")).toBeInTheDocument()
  })

  it("n'affiche pas la phrase de réflexion pour un message assistant avec du contenu en streaming", () => {
    render(<MessageBubble message={assistantMessage} isStreaming />)
    expect(screen.queryByTestId("thinking-phrase")).not.toBeInTheDocument()
  })

  it("affiche le curseur bloc pendant le streaming avec du contenu, en fin de dernière ligne", () => {
    render(<MessageBubble message={assistantMessage} isStreaming />)
    expect(screen.getByTestId("streaming-cursor")).toHaveClass("cursor-block")
    expect(screen.getByTestId("markdown-content").parentElement?.className).toContain(":inline")
  })

  it("n'affiche pas le curseur quand le streaming est terminé", () => {
    render(<MessageBubble message={assistantMessage} />)
    expect(screen.queryByTestId("streaming-cursor")).not.toBeInTheDocument()
  })

  it("n'affiche pas la phrase de réflexion pour un message utilisateur vide en streaming", () => {
    render(<MessageBubble message={{ ...userMessage, content: "" }} isStreaming />)
    expect(screen.queryByTestId("thinking-phrase")).not.toBeInTheDocument()
  })

  describe("sources", () => {
    const withSources: IMessage = {
      ...assistantMessage,
      sources: [
        { label: "cv.pdf", source: "cv", url: "/cv-damien-pasulj.pdf" },
        { label: "LinkedIn", source: "linkedin", url: "https://www.linkedin.com/in/music-all/" },
      ],
    }

    it("liste les sources comme des noms de fichiers cliquables", () => {
      render(<MessageBubble message={withSources} />)
      expect(screen.getByTestId("message-sources")).toHaveTextContent(chat.sourcesDir)
      expect(screen.getByRole("link", { name: "cv.pdf" })).toHaveAttribute("href", "/cv-damien-pasulj.pdf")
      expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveClass("file-name")
    })

    it("n'affiche pas les sources pendant le streaming", () => {
      render(<MessageBubble message={withSources} isStreaming />)
      expect(screen.queryByTestId("message-sources")).not.toBeInTheDocument()
    })

    it("n'affiche pas les sources pour les messages utilisateur", () => {
      render(<MessageBubble message={{ ...userMessage, sources: withSources.sources }} />)
      expect(screen.queryByTestId("message-sources")).not.toBeInTheDocument()
    })

    it("n'affiche pas les sources si le tableau est vide", () => {
      render(<MessageBubble message={{ ...assistantMessage, sources: [] }} />)
      expect(screen.queryByTestId("message-sources")).not.toBeInTheDocument()
    })

    it("affiche les sources sans url comme du texte non cliquable", () => {
      render(<MessageBubble message={{ ...assistantMessage, sources: [{ label: "profil.md", source: "profil" }] }} />)
      expect(screen.getByText("profil.md").tagName).toBe("SPAN")
      expect(screen.queryByRole("link", { name: "profil.md" })).not.toBeInTheDocument()
    })
  })

  describe("rendu markdown", () => {
    function assistantWith(content: string): IMessage {
      return { id: "md", role: "assistant", content, createdAt: new Date() }
    }

    it("rend le gras markdown en <strong>", () => {
      render(<MessageBubble message={assistantWith("Je maîtrise **React** et **Next.js**.")} />)
      expect(screen.getByText("React").tagName).toBe("STRONG")
    })

    it("rend l'italique markdown en <em>", () => {
      render(<MessageBubble message={assistantWith("Un peu d'*exploration* IA.")} />)
      expect(screen.getByText("exploration").tagName).toBe("EM")
    })

    it("rend les listes markdown en éléments de liste", () => {
      const { container } = render(<MessageBubble message={assistantWith("- React\n- Node.js")} />)
      expect(container.querySelectorAll("li")).toHaveLength(2)
    })

    it("rend les liens markdown en ancres ouvrant un nouvel onglet", () => {
      render(<MessageBubble message={assistantWith("Voir [mon LinkedIn](https://linkedin.com/in/music-all).")} />)
      const link = screen.getByRole("link", { name: "mon LinkedIn" })
      expect(link).toHaveAttribute("href", "https://linkedin.com/in/music-all")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("n'interprète pas le HTML brut (échappé par react-markdown)", () => {
      render(<MessageBubble message={assistantWith("<img src=x onerror=alert(1)>")} />)
      expect(screen.getByTestId("markdown-content").querySelector("img")).not.toBeInTheDocument()
    })

    it("n'applique pas le rendu markdown au contenu utilisateur", () => {
      render(<MessageBubble message={{ id: "u", role: "user", content: "Texte **non gras**", createdAt: new Date() }} />)
      expect(screen.getByText("Texte **non gras**")).toBeInTheDocument()
      expect(screen.queryByTestId("markdown-content")).not.toBeInTheDocument()
    })
  })

  describe("action copier", () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it("propose de copier une réponse terminée", () => {
      render(<MessageBubble message={assistantMessage} />)
      expect(screen.getByRole("button", { name: chat.copy })).toHaveTextContent(chat.copyLabel)
    })

    it("ne propose pas de copier une question du visiteur", () => {
      render(<MessageBubble message={userMessage} />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("ne propose pas de copier pendant le streaming", () => {
      render(<MessageBubble message={assistantMessage} isStreaming />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("ne propose pas de copier un message vide", () => {
      render(<MessageBubble message={{ ...assistantMessage, content: "" }} />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("copie le contenu, confirme pendant 2 s puis revient à l'état initial", () => {
      vi.useFakeTimers()
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      render(<MessageBubble message={assistantMessage} />)
      fireEvent.click(screen.getByTestId("copy-button"))

      expect(writeText).toHaveBeenCalledWith("Salut ! Je vais bien, merci.")
      expect(screen.getByTestId("copy-button")).toHaveAccessibleName(chat.copied)
      expect(screen.getByTestId("copy-button")).toHaveTextContent(chat.copiedLabel)

      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(screen.getByTestId("copy-button")).toHaveAccessibleName(chat.copy)
    })
  })

  describe("action renvoyer", () => {
    it("n'apparaît pas sans la prop onReuse", () => {
      render(<MessageBubble message={userMessage} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("n'apparaît pas pour un message assistant, même avec onReuse", () => {
      render(<MessageBubble message={assistantMessage} onReuse={vi.fn()} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("n'apparaît pas pendant le streaming", () => {
      render(<MessageBubble message={userMessage} onReuse={vi.fn()} isStreaming />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })

    it("renvoie le contenu de la question au clic", () => {
      const onReuse = vi.fn()
      render(<MessageBubble message={userMessage} onReuse={onReuse} />)
      const button = screen.getByRole("button", { name: chat.reuse })
      expect(button).toHaveTextContent(chat.reuseLabel)
      fireEvent.click(button)
      expect(onReuse).toHaveBeenCalledWith("Bonjour, comment ça va ?")
    })

    it("ne se révèle au survol que sur les appareils à pointeur fin (toujours visible au doigt)", () => {
      render(<MessageBubble message={userMessage} onReuse={vi.fn()} />)
      expect(screen.getByTestId("reuse-button").className).toContain("[@media(hover:hover)_and_(pointer:fine)]:opacity-0")
    })
  })

  describe("showActions", () => {
    it("masque l'action copier quand showActions est false", () => {
      render(<MessageBubble message={assistantMessage} showActions={false} />)
      expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument()
    })

    it("masque l'action renvoyer quand showActions est false", () => {
      render(<MessageBubble message={userMessage} onReuse={vi.fn()} showActions={false} />)
      expect(screen.queryByTestId("reuse-button")).not.toBeInTheDocument()
    })
  })

  describe("statut d'erreur", () => {
    const errorMessage: IMessage = {
      id: "err",
      role: "assistant",
      content: "Une erreur est survenue. Réessaie dans un instant.",
      status: "error",
      createdAt: new Date("2024-01-01T10:00:02"),
    }

    it("remplace l'heure par « erreur » et passe le texte à l'encre", () => {
      render(<MessageBubble message={errorMessage} />)
      expect(screen.getByText(chat.errorLabel)).toBeInTheDocument()
      expect(screen.getByTestId("message-bubble-error")).toHaveClass("text-ink")
    })

    it("masque l'action copier sur une réponse en erreur", () => {
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

describe("MessageBubble : mesure d'audience", () => {
  beforeEach(() => {
    trackEvent.mockClear()
  })

  it("consigne la copie d'un message avec son rôle", () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } })
    render(<MessageBubble message={assistantMessage} />)

    fireEvent.click(screen.getByTestId("copy-button"))

    expect(trackEvent).toHaveBeenCalledWith("chat_message_copied", { role: "assistant" })
  })

  it("consigne le renvoi d'un message utilisateur", () => {
    render(<MessageBubble message={userMessage} onReuse={() => {}} />)

    fireEvent.click(screen.getByTestId("reuse-button"))

    expect(trackEvent).toHaveBeenCalledWith("chat_message_reused")
  })

  it("consigne le clic sur une source, par son libellé", () => {
    render(<MessageBubble message={{ ...assistantMessage, sources: [{ source: "github", label: "GitHub", url: "https://github.com/damienpjs" }] }} />)

    fireEvent.click(screen.getByRole("link", { name: "GitHub" }))

    expect(trackEvent).toHaveBeenCalledWith("chat_source_clicked", { source_label: "GitHub" })
  })
})

"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MessageBubble } from "@/components/features/message-bubble"
import type { IMessage } from "@/components/features/message-bubble"
import { streamChat, type IStreamResult, type ISourceInfo } from "@/lib/stream-chat"
import { useLocale } from "@/lib/locale-context"
import { trackEvent } from "@/lib/analytics"
import { characterSpeaks, setCharacterActivity, setCharacterMood } from "@/lib/character/character-cues"
import { cn } from "@/lib/utils"

import { SESSION_STORAGE_KEY, SUGGESTIONS_STORAGE_KEY, WELCOME_MESSAGE_ID, createWelcomeMessage } from "@/constants/chat"
import { SUGGESTION_IDS, type TSuggestionId } from "@/constants/dictionary"

function loadUsedSuggestions(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(SUGGESTIONS_STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

// Isomorphic : useLayoutEffect côté client, useEffect côté serveur (SSR)
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

function generateId(): string {
  return crypto.randomUUID()
}

function SessionLoader({ label }: { label: string }) {
  return (
    <div data-testid="session-loader" role="status" className="flex h-full items-center justify-center">
      <p className="text-[14px] text-body">
        {label}
        <span aria-hidden="true" className="cursor-block" />
      </p>
    </div>
  )
}

/** Chemin d'appel d'un envoi de message, sert de dimension GA4 `origin`. */
export type TMessageOrigin = "input" | "suggestion" | "reuse"

interface IChatInterfaceProps {
  /** Masque la liste des messages pendant la transition d'ouverture (morph de la bulle d'accueil). */
  messagesVisible?: boolean
  /** Remonte le nombre de messages échangés (hors bulle d'accueil) : la page
   *  parente en a besoin pour qualifier la fermeture du chat. */
  onTurnsChange?: (turns: number) => void
}

export function ChatInterface({ messagesVisible = true, onTurnsChange }: IChatInterfaceProps) {
  const { locale, t } = useLocale()
  const [messages, setMessages] = useState<IMessage[]>(() => [createWelcomeMessage(t.chat.welcome)])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(loadUsedSuggestions)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const sessionIdRef = useRef<string | undefined>(undefined)

  // Vérifie localStorage avant le premier paint pour éviter tout flash de contenu
  useIsomorphicLayoutEffect(() => {
    if (localStorage.getItem(SESSION_STORAGE_KEY)) {
      setIsLoadingSession(true)
    }
  }, [])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      // Premier rendu : scroll en haut pour voir le début de la conversation
      isInitialMount.current = false
      messagesContainerRef.current?.scrollTo?.({ top: 0 })
      return
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isStreaming])

  // Restaure la session depuis localStorage au montage
  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!storedSessionId) return

    fetch(`/api/chat/session/${storedSessionId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Session non disponible")
        const data = (await res.json()) as { messages: Array<{ id: string; role: "user" | "assistant"; content: string; status: "ok" | "error"; sources: ISourceInfo[] | null; createdAt: string }> }
        if (!data.messages.length) {
          localStorage.removeItem(SESSION_STORAGE_KEY)
          return
        }
        sessionIdRef.current = storedSessionId
        setMessages((prev) => [prev[0], ...data.messages.map((m) => ({ ...m, sources: m.sources ?? undefined, createdAt: new Date(m.createdAt) }))])
      })
      .catch(() => {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      })
      .finally(() => {
        setIsLoadingSession(false)
      })
  }, [])

  // Auto-focus le textarea au montage (sauf mobile pour éviter le scroll causé par le clavier virtuel)
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches
    if (!isMobile) {
      textareaRef.current?.focus()
    }
  }, [])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Le nombre de tours vit ici (avec les messages) mais se mesure au moment où
  // le visiteur referme le chat, côté page : on le remonte à chaque échange.
  useEffect(() => {
    onTurnsChange?.(messages.length - 1)
  }, [messages.length, onTurnsChange])

  const handleResize = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = "auto"
    const maxHeight = 128 // 8rem = 32 * 4 = 128px (max-h-32)
    const newHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${newHeight}px`
    // Afficher la scrollbar seulement si le contenu dépasse max-height
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden"
  }, [])

  const sendMessage = useCallback(
    async (overrideContent?: string, origin: TMessageOrigin = "input") => {
      const content = overrideContent ?? input.trim()
      if (!content || isStreaming) return

      // `origin` est passé explicitement par l'appelant : le déduire à
      // l'exécution serait deviner. `turn_index` compte les messages déjà
      // échangés, bulle d'accueil exclue.
      trackEvent("chat_message_sent", { origin, turn_index: messages.length - 1 })

      const userMessage: IMessage = {
        id: generateId(),
        role: "user",
        content,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput("")
      // Le champ a pu grandir sur plusieurs lignes : il reprend sa hauteur d'une ligne.
      if (textareaRef.current) textareaRef.current.style.height = ""

      // Fermer le clavier virtuel sur mobile
      textareaRef.current?.blur()

      // Créer le message assistant vide pour le streaming
      const assistantMessageId = generateId()
      const assistantMessage: IMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }

      // On affiche tout de suite la bulle assistant vide : c'est elle qui porte le
      // placeholder « Damien réfléchit… » (ThinkingPhrase) tant que le contenu est vide.
      setMessages((prev) => [...prev, assistantMessage])
      setIsStreaming(true)
      setStreamingMessageId(assistantMessageId)
      // Le personnage réfléchit jusqu'à la première lettre de la réponse.
      setCharacterActivity("thinking")
      let started = false

      // Petit délai avant de commencer le stream (effet naturel). La phrase de
      // réflexion reste affichée pendant ce temps.
      await new Promise<void>((resolve) => setTimeout(resolve, 300))

      // Créer un AbortController pour pouvoir annuler la requête
      abortControllerRef.current = new AbortController()

      await streamChat(content, {
        signal: abortControllerRef.current.signal,
        sessionId: sessionIdRef.current,
        locale,
        onMood: setCharacterMood,
        onChunk: (char) => {
          if (!started) {
            started = true
            setCharacterActivity("talking")
          }
          characterSpeaks(char)
          setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: msg.content + char } : msg)))
        },
        onComplete: (result: IStreamResult) => {
          if (result.sessionId) {
            sessionIdRef.current = result.sessionId
            localStorage.setItem(SESSION_STORAGE_KEY, result.sessionId)
          }
          if (result.sources && result.sources.length > 0) {
            setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, sources: result.sources } : msg)))
          }
          if (result.status === "error") {
            setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, status: "error" } : msg)))
          }
          trackEvent("chat_response_completed", {
            status: result.status ?? "ok",
            has_sources: Boolean(result.sources?.length),
            source_count: result.sources?.length ?? 0,
          })
          setIsStreaming(false)
          setStreamingMessageId(null)
          abortControllerRef.current = null
          setCharacterActivity("listening")
          if (!window.matchMedia("(pointer: coarse)").matches) {
            textareaRef.current?.focus()
          }
        },
        onError: (error) => {
          console.error("Erreur stream chat:", error)
          trackEvent("chat_response_error")
          setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: t.chat.streamError } : msg)))
          setCharacterMood("sorry")
          setCharacterActivity("listening")
          setIsStreaming(false)
          setStreamingMessageId(null)
          abortControllerRef.current = null
          if (!window.matchMedia("(pointer: coarse)").matches) {
            textareaRef.current?.focus()
          }
        },
      })
    },
    [input, isStreaming, locale, messages.length, t],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void sendMessage()
      }
    },
    [sendMessage],
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  // On mémorise l'identifiant de la suggestion, pas son libellé : changer de
  // langue ne doit pas faire réapparaître une suggestion déjà utilisée.
  const handleSuggestionClick = useCallback(
    (id: TSuggestionId, label: string) => {
      setUsedSuggestions((prev) => {
        const next = new Set(prev).add(id)
        localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify([...next]))
        return next
      })
      trackEvent("suggestion_clicked", { suggestion_id: id })
      void sendMessage(label, "suggestion")
    },
    [sendMessage],
  )

  const handleReset = useCallback(() => {
    trackEvent("chat_reset", { turns: messages.length - 1 })

    // Annule un éventuel stream en cours
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    // Réinitialise la session côté client
    sessionIdRef.current = undefined
    localStorage.removeItem(SESSION_STORAGE_KEY)

    // Rend les suggestions de nouveau disponibles
    localStorage.removeItem(SUGGESTIONS_STORAGE_KEY)
    setUsedSuggestions(new Set())

    // Repart d'une conversation vierge, visage au repos
    setCharacterActivity("listening")
    setCharacterMood("neutral")
    setMessages((prev) => [prev[0]])
    setInput("")
    setIsStreaming(false)
    setStreamingMessageId(null)

    if (!window.matchMedia("(pointer: coarse)").matches) {
      textareaRef.current?.focus()
    }
  }, [messages.length])

  // Renvoie directement le message sélectionné, sans repasser par le champ de saisie.
  const handleReuseMessage = useCallback(
    (content: string) => {
      void sendMessage(content, "reuse")
    },
    [sendMessage],
  )

  const remainingSuggestions = SUGGESTION_IDS.filter((id) => !usedSuggestions.has(id))

  // La bulle d'accueil n'est pas persistée : on la re-rend toujours dans la
  // langue courante, même si la conversation a démarré dans l'autre.
  const displayedMessages = useMemo(() => messages.map((message) => (message.id === WELCOME_MESSAGE_ID ? { ...message, content: t.chat.welcome } : message)), [messages, t])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Zone de messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-6 lg:pr-12 lg:pl-16">
        {isLoadingSession ? (
          <SessionLoader label={t.chat.loadingSession} />
        ) : (
          <div className={cn("flex flex-col gap-8 transition-opacity duration-300", messagesVisible ? "opacity-100" : "opacity-0")}>
            {displayedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} isStreaming={message.id === streamingMessageId} onReuse={message.role === "user" ? handleReuseMessage : undefined} />
            ))}

            {/* Suggestions de questions : un dossier, une ligne de terminal par question */}
            {remainingSuggestions.length > 0 && !isStreaming && (
              <div data-testid="suggestions">
                <p className="mb-1.5 text-[13px]">
                  <span className="font-bold tracking-[0.1em] text-ink uppercase">{t.chat.suggestionsDir}</span>
                  {" "}
                  <span className="text-coral-ink">{t.common.itemCount(remainingSuggestions.length)}</span>
                </p>
                <ul className="border-b border-rule">
                  {remainingSuggestions.map((id) => (
                    <li key={id} className="border-t border-rule">
                      <button type="button" onClick={() => handleSuggestionClick(id, t.chat.suggestions[id])} className="w-full cursor-pointer py-3 text-left text-[14px] text-ink transition-colors hover:text-teal-ink">
                        <span aria-hidden="true" className="mr-[1ch] text-teal-ink">
                          &gt;
                        </span>
                        {t.chat.suggestions[id]}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Barre de saisie */}
      <div className="border-t border-rule bg-paper px-3 pt-3 pb-7 lg:pt-5 lg:pr-12 lg:pb-6 lg:pl-16">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendMessage()
          }}
          className="flex items-end gap-2 lg:gap-3"
        >
          {messages.length > 1 && (
            <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(true)} disabled={isLoadingSession} aria-label={t.chat.reset} className="h-12 min-w-12 px-0 lg:px-4">
              <span aria-hidden="true" className="text-[18px] lg:hidden">
                ↺
              </span>
              <span className="hidden lg:inline">{t.chat.resetLabel}</span>
            </Button>
          )}
          <label className="flex min-h-12 min-w-0 flex-1 items-start gap-[1ch] border border-control px-3 py-3 transition-colors focus-within:border-teal-ink focus-within:outline focus-within:outline-1 focus-within:outline-teal-ink lg:px-4">
            <span aria-hidden="true" className="leading-6 text-teal-ink">
              &gt;
            </span>
            <textarea
              ref={textareaRef}
              value={input}
              name="message"
              onChange={handleChange}
              onInput={handleResize}
              onKeyDown={handleKeyDown}
              enterKeyHint="send"
              placeholder={isStreaming ? t.chat.thinkingAria : t.chat.inputPlaceholder}
              rows={1}
              disabled={isLoadingSession}
              aria-label={t.chat.inputAria}
              className="max-h-32 min-h-6 min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent text-[16px] leading-6 text-ink outline-none placeholder:text-body lg:text-[15px]"
            />
          </label>
          <Button type="submit" disabled={!input.trim() || isStreaming || isLoadingSession} aria-label={t.chat.sendAria} className="h-12 min-w-12 px-0 lg:px-5">
            <span aria-hidden="true" className="text-[18px] lg:hidden">
              ↲
            </span>
            <span className="hidden lg:inline">{t.chat.send}</span>
          </Button>
        </form>
      </div>

      <ConfirmDialog
        open={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        title={t.chat.resetDialogTitle}
        description={t.chat.resetDialogDescription}
        confirmLabel={t.chat.resetConfirm}
        cancelLabel={t.chat.resetCancel}
        onConfirm={handleReset}
        destructive
      />
    </div>
  )
}

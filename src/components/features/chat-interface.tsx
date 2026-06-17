"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageBubble } from "@/components/features/message-bubble"
import type { IMessage } from "@/components/features/message-bubble"
import { streamChat, type IStreamResult, type ISourceInfo } from "@/lib/stream-chat"
import { cn } from "@/lib/utils"

import { SESSION_STORAGE_KEY, SUGGESTIONS_STORAGE_KEY, SUGGESTIONS, WELCOME_MESSAGE } from "@/constants/chat"

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

function SessionLoader() {
  return (
    <div data-testid="session-loader" className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F9B288]/20 border-t-[#F9B288]" />
        <p className="text-sm text-muted-foreground">Chargement de la conversation…</p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div data-testid="typing-indicator" className="flex items-end gap-3">
      <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8A070] to-[#F9B288] text-xs font-semibold text-white select-none">
        AI
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1" aria-label="L'assistant est en train d'écrire">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

interface IChatInterfaceProps {
  /** Masque la liste des messages pendant la transition d'ouverture (morph de la bulle d'accueil). */
  messagesVisible?: boolean
}

export function ChatInterface({ messagesVisible = true }: IChatInterfaceProps) {
  const [messages, setMessages] = useState<IMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(loadUsedSuggestions)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
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
  }, [messages, isTyping, isStreaming])

  // Restaure la session depuis localStorage au montage
  useEffect(() => {
    const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!storedSessionId) return

    fetch(`/api/chat/session/${storedSessionId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Session non disponible")
        const data = (await res.json()) as { messages: Array<{ id: string; role: "user" | "assistant"; content: string; sources: ISourceInfo[] | null; createdAt: string }> }
        if (!data.messages.length) {
          localStorage.removeItem(SESSION_STORAGE_KEY)
          return
        }
        sessionIdRef.current = storedSessionId
        setMessages([WELCOME_MESSAGE, ...data.messages.map((m) => ({ ...m, sources: m.sources ?? undefined, createdAt: new Date(m.createdAt) }))])
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
    async (overrideContent?: string) => {
      const content = overrideContent ?? input.trim()
      if (!content || isTyping || isStreaming) return

      const userMessage: IMessage = {
        id: generateId(),
        role: "user",
        content,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setIsTyping(true)

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

      // Petit délai avant de commencer le stream (effet naturel)
      await new Promise<void>((resolve) => setTimeout(resolve, 300))

      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
      setIsStreaming(true)
      setStreamingMessageId(assistantMessageId)

      // Créer un AbortController pour pouvoir annuler la requête
      abortControllerRef.current = new AbortController()

      await streamChat(content, {
        signal: abortControllerRef.current.signal,
        sessionId: sessionIdRef.current,
        onChunk: (char) => {
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
          setIsStreaming(false)
          setStreamingMessageId(null)
          abortControllerRef.current = null
          if (!window.matchMedia("(pointer: coarse)").matches) {
            textareaRef.current?.focus()
          }
        },
        onError: (error) => {
          console.error("Erreur stream chat:", error)
          setMessages((prev) => prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: "Désolé, une erreur est survenue. Réessaie !" } : msg)))
          setIsStreaming(false)
          setStreamingMessageId(null)
          abortControllerRef.current = null
          if (!window.matchMedia("(pointer: coarse)").matches) {
            textareaRef.current?.focus()
          }
        },
      })
    },
    [input, isTyping, isStreaming],
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

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setUsedSuggestions((prev) => {
        const next = new Set(prev).add(suggestion)
        localStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify([...next]))
        return next
      })
      void sendMessage(suggestion)
    },
    [sendMessage],
  )

  const handleReuseMessage = useCallback((content: string) => {
    setInput(content)
    setTimeout(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = "auto"
      const maxHeight = 128
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden"
      el.focus()
    }, 0)
  }, [])

  const remainingSuggestions = SUGGESTIONS.filter((s) => !usedSuggestions.has(s))

  return (
    <div className="flex flex-1 flex-col overflow-hidden overflow-x-hidden font-[family-name:var(--font-chat)]">
      {/* Zone de messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-6">
        {isLoadingSession ? (
          <SessionLoader />
        ) : (
          <div className={cn("mx-auto flex max-w-3xl flex-col gap-4 transition-opacity duration-300", messagesVisible ? "opacity-100" : "opacity-0")}>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} isStreaming={message.id === streamingMessageId} onReuse={message.role === "user" ? handleReuseMessage : undefined} />
            ))}

            {/* Suggestions de questions */}
            {remainingSuggestions.length > 0 && !isTyping && !isStreaming && (
              <div data-testid="suggestions" className="flex flex-col gap-2 pt-2">
                <p className="text-xs text-muted-foreground">Suggestions :</p>
                <div className="flex flex-wrap gap-2">
                  {remainingSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="cursor-pointer rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-[#F9B288]/50 hover:bg-[#F9B288]/10 hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Barre de saisie */}
      <div className="border-t border-border bg-background/60 p-2 sm:p-4 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendMessage()
          }}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={input}
            name="message"
            onChange={handleChange}
            onInput={handleResize}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
            placeholder="Écris ton message…"
            rows={1}
            disabled={isLoadingSession}
            aria-label="Message à envoyer"
            className={cn(
              "min-w-0 flex-1 resize-none rounded-xl ring-1 ring-white/20 bg-input/30 px-3 sm:px-4 py-2",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "max-h-32 min-h-9 overflow-y-hidden leading-relaxed backdrop-blur-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring/50",
            )}
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={!input.trim() || isTyping || isStreaming || isLoadingSession}
            aria-label="Envoyer"
            className="shrink-0 bg-gradient-to-br from-[#E8A070] to-[#F9B288] text-white shadow-md shadow-[#F9B288]/20 hover:from-[#D99060] hover:to-[#E8A070] disabled:opacity-40"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

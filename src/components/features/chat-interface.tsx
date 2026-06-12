"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MessageBubble, type IMessage } from "@/components/features/message-bubble"
import { getMockResponse } from "@/lib/mock-responses"
import { cn } from "@/lib/utils"

export const MOCK_DELAY_MS = 800

function generateId(): string {
  return crypto.randomUUID()
}

function TypingIndicator() {
  return (
    <div data-testid="typing-indicator" className="flex items-end gap-3">
      <div aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-orange-400 text-xs font-semibold text-white select-none">
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

const WELCOME_MESSAGE: IMessage = {
  id: "welcome",
  role: "assistant",
  content: "Bonjour ! 👋 Je suis l'IA de Damien. Pose-moi tes questions sur son parcours, ses compétences ou ses projets.",
  createdAt: new Date(),
}

export function ChatInterface() {
  const [messages, setMessages] = useState<IMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const handleResize = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [])

  const sendMessage = useCallback(async () => {
    const content = input.trim()
    if (!content || isTyping) return

    const userMessage: IMessage = {
      id: generateId(),
      role: "user",
      content,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

    const assistantMessage: IMessage = {
      id: generateId(),
      role: "assistant",
      content: getMockResponse(content),
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsTyping(false)
  }, [input, isTyping])

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

  const handleSendClick = useCallback(() => {
    void sendMessage()
  }, [sendMessage])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Zone de messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </div>

      {/* Barre de saisie */}
      <div className="border-t border-border bg-background/60 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={handleChange}
            onInput={handleResize}
            onKeyDown={handleKeyDown}
            placeholder="Écris ton message…"
            rows={1}
            disabled={isTyping}
            aria-label="Message à envoyer"
            className={cn(
              "flex-1 resize-none rounded-xl border border-border bg-input/30 px-4 py-3",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "max-h-32 overflow-y-auto leading-relaxed backdrop-blur-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <Button
            size="icon-lg"
            onClick={handleSendClick}
            disabled={!input.trim() || isTyping}
            aria-label="Envoyer"
            className="shrink-0 bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-md shadow-violet-900/20 hover:from-violet-700 hover:to-violet-800 disabled:opacity-40"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { ThinkingPhrase } from "@/components/features/thinking-phrase"
import type { ISourceInfo } from "@/lib/stream-chat"

export type TMessageStatus = "ok" | "error"

export interface IMessage {
  id: string
  content: string
  role: "user" | "assistant"
  createdAt: Date
  sources?: ISourceInfo[]
  /** "error" pour une réponse assistant de repli après un échec LLM. Style distinct, actions masquées. */
  status?: TMessageStatus
}

export type TMessageRole = IMessage["role"]

interface IMessageBubbleProps {
  message: IMessage
  isStreaming?: boolean
  onReuse?: (content: string) => void
  /** Affiche les boutons d'action (copier, réutiliser). Désactivé pour la bulle d'accueil de la landing. */
  showActions?: boolean
}

/** Les liens markdown s'ouvrent dans un nouvel onglet et héritent du style accent. */
const markdownComponents: Components = {
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-coral underline decoration-coral/40 underline-offset-2 hover:decoration-coral">
      {children}
    </a>
  ),
}

/**
 * Rend le contenu markdown de l'assistant (gras, italique, listes, liens, code).
 * Le HTML brut n'est jamais interprété : react-markdown l'échappe par défaut.
 */
function MarkdownMessage({ content }: { content: string }) {
  return (
    <div
      data-testid="markdown-content"
      className={cn(
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-2 [&_strong]:font-semibold [&_em]:italic",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_h1]:my-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:my-2 [&_h3]:font-semibold",
        "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  )
}

export function MessageBubble({ message, isStreaming = false, onReuse, showActions = true }: IMessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [tapped, setTapped] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const isUser = message.role === "user"
  const isError = !isUser && message.status === "error"
  const isEmpty = !message.content
  const showThinking = !isUser && isStreaming && isEmpty
  const showCursor = !isUser && isStreaming && !isEmpty
  const showSources = !isUser && !isStreaming && message.sources && message.sources.length > 0

  useEffect(() => {
    if (!tapped) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setTapped(false)
      }
    }
    document.addEventListener("pointerdown", handleOutside)
    return () => document.removeEventListener("pointerdown", handleOutside)
  }, [tapped])

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleBubbleTap() {
    setTapped((prev) => !prev)
  }

  function handleReuse(e: React.MouseEvent) {
    e.stopPropagation()
    onReuse?.(message.content)
  }

  return (
    <div ref={bubbleRef} data-testid="message-bubble" onClick={handleBubbleTap} className={cn("group/bubble flex w-full items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold select-none", isUser ? "bg-white/10 text-white" : "bg-gradient-to-br from-coral-deep to-coral text-white")}>
        {isUser ? "🫵" : <Image src="/bot-avatar.png" alt="" width={32} height={32} className="h-full w-full object-cover" />}
      </div>

      <div className={cn("relative", showThinking ? "w-[75%]" : "max-w-[75%]")}>
        <div
          data-testid={isError ? "message-bubble-error" : undefined}
          className={cn(
            "break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed tracking-wide",
            isUser
              ? "rounded-br-sm bg-white/8 text-coral ring-1 ring-coral/20 shadow-sm"
              : isError
                ? "rounded-bl-sm border border-destructive/30 bg-destructive/10 text-destructive"
                : "rounded-bl-sm border border-border bg-card text-card-foreground",
          )}
        >
          {showThinking ? (
            <ThinkingPhrase />
          ) : (
            <>
              {isUser ? message.content : <MarkdownMessage content={message.content} />}
              {showCursor && <span data-testid="streaming-cursor" className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-text-bottom" />}
              {showSources && (
                <div data-testid="message-sources" className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
                  <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Sources</span>
                  {message.sources!.map((s) => {
                    const baseClass =
                      "inline-flex items-center rounded-full border border-coral/20 bg-coral/5 px-2 py-0.5 text-[11px] font-medium text-coral/80 transition-colors hover:border-coral/40 hover:bg-coral/10 hover:text-coral"

                    return s.url ? (
                      <a key={s.source} href={s.url} target="_blank" rel="noopener noreferrer" className={cn(baseClass, "cursor-pointer underline decoration-coral/30 underline-offset-2")}>
                        {s.label}
                      </a>
                    ) : (
                      <span key={s.source} className={baseClass}>
                        {s.label}
                      </span>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {message.content && !isStreaming && showActions && !isError && (
          <div className="absolute -top-3 right-1 flex gap-1">
            {isUser && onReuse && (
              <button
                data-testid="reuse-button"
                type="button"
                onClick={handleReuse}
                aria-label="Renvoyer ce message"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-0 transition-opacity [@media(hover:hover)_and_(pointer:fine)]:group-hover/bubble:opacity-100",
                  tapped && "opacity-100",
                )}
              >
                <svg data-testid="reuse-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 10 4 15 9 20" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
              </button>
            )}
            <button
              data-testid="copy-button"
              type="button"
              onClick={handleCopy}
              aria-label={copied ? "Copié" : "Copier le message"}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-0 transition-opacity [@media(hover:hover)_and_(pointer:fine)]:group-hover/bubble:opacity-100",
                tapped && "opacity-100",
                copied && "text-green-500",
              )}
            >
              {copied ? (
                <svg data-testid="check-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg data-testid="copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

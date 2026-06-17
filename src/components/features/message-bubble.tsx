"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { ISourceInfo } from "@/lib/stream-chat"

export interface IMessage {
  id: string
  content: string
  role: "user" | "assistant"
  createdAt: Date
  sources?: ISourceInfo[]
}

export type TMessageRole = IMessage["role"]

interface IMessageBubbleProps {
  message: IMessage
  isStreaming?: boolean
  onReuse?: (content: string) => void
  /** Affiche les boutons d'action (copier, réutiliser). Désactivé pour la bulle d'accueil de la landing. */
  showActions?: boolean
}

function StreamingSkeleton() {
  return (
    <div data-testid="streaming-skeleton" className="flex flex-col gap-2 py-0.5">
      <div className="h-3 w-full animate-pulse rounded-md bg-muted-foreground/20" />
      <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted-foreground/15 [animation-delay:150ms]" />
      <div className="h-3 w-3/5 animate-pulse rounded-md bg-muted-foreground/10 [animation-delay:300ms]" />
    </div>
  )
}

export function MessageBubble({ message, isStreaming = false, onReuse, showActions = true }: IMessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [tapped, setTapped] = useState(false)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const isUser = message.role === "user"
  const isEmpty = !message.content
  const showSkeleton = !isUser && isStreaming && isEmpty
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
      <div aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold select-none", isUser ? "bg-white/10 text-white" : "bg-gradient-to-br from-[#E8A070] to-[#F9B288] text-white")}>
        {isUser ? "🫵" : <Image src="/bot-avatar.png" alt="" width={32} height={32} className="h-full w-full object-cover" />}
      </div>

      <div className={cn("relative", showSkeleton ? "w-[75%]" : "max-w-[75%]")}>
        <div
          className={cn(
            "break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed tracking-wide",
            isUser ? "rounded-br-sm bg-white/8 text-[#F9B288] ring-1 ring-[#F9B288]/20 shadow-sm" : "rounded-bl-sm border border-border bg-card text-card-foreground",
          )}
        >
          {showSkeleton ? (
            <StreamingSkeleton />
          ) : (
            <>
              {message.content}
              {showCursor && <span data-testid="streaming-cursor" className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-text-bottom" />}
              {showSources && (
                <div data-testid="message-sources" className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
                  <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Sources</span>
                  {message.sources!.map((s) => {
                    const baseClass =
                      "inline-flex items-center rounded-full border border-[#F9B288]/20 bg-[#F9B288]/5 px-2 py-0.5 text-[11px] font-medium text-[#F9B288]/80 transition-colors hover:border-[#F9B288]/40 hover:bg-[#F9B288]/10 hover:text-[#F9B288]"

                    return s.url ? (
                      <a key={s.source} href={s.url} target="_blank" rel="noopener noreferrer" className={cn(baseClass, "cursor-pointer underline decoration-[#F9B288]/30 underline-offset-2")}>
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

        {message.content && !isStreaming && showActions && (
          <div className="absolute -top-3 right-1 flex gap-1">
            {isUser && onReuse && (
              <button
                data-testid="reuse-button"
                type="button"
                onClick={handleReuse}
                aria-label="Remettre dans le tchat"
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

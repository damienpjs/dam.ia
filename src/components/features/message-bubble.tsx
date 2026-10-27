"use client"

import { useState } from "react"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/locale-context"
import { trackEvent } from "@/lib/analytics"
import { formatClock } from "@/lib/format"
import { ThinkingPhrase } from "@/components/features/thinking-phrase"
import { ReadmeCard } from "@/components/features/readme-card"
import { WELCOME_MESSAGE_ID } from "@/constants/chat"
import { ASSISTANT_NAME } from "@/constants/profile"
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
  /** Affiche les actions (copier, renvoyer). */
  showActions?: boolean
}

/** Les liens markdown s'ouvrent dans un nouvel onglet, à l'encre teal des noms de fichiers. */
const markdownComponents: Components = {
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="file-name hover:text-ink">
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
        "[&_p]:my-2.5 [&_strong]:font-bold [&_strong]:text-ink [&_em]:italic",
        "[&_ul]:my-2 [&_ul]:list-none [&_ul]:pl-[2ch] [&_ul>li]:-indent-[2ch] [&_ul>li]:before:content-['-_'] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-[3ch] [&_li]:my-1",
        "[&_code]:bg-rule/50 [&_code]:px-1 [&_code]:text-ink",
        "[&_pre]:my-2.5 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-rule [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_h1]:my-2.5 [&_h1]:font-bold [&_h1]:text-ink [&_h2]:my-2.5 [&_h2]:font-bold [&_h2]:text-ink [&_h3]:my-2.5 [&_h3]:font-bold [&_h3]:text-ink",
        "[&_blockquote]:my-2.5 [&_blockquote]:border-l [&_blockquote]:border-rule [&_blockquote]:pl-3",
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  )
}

/** Petite action textuelle sous un message (copier, renvoyer). */
const ACTION_CLASS = "cursor-pointer py-1 text-[13px] text-body transition-colors hover:text-teal-ink"

/**
 * Un message de la conversation.
 *
 * Trois rendus, dans l'esprit du CV : le message d'accueil est un README.md,
 * une question du visiteur une ligne de terminal préfixée « > », une réponse
 * un bloc signé « damien.ia » avec son heure (ou « erreur ») en corail.
 */
export function MessageBubble({ message, isStreaming = false, onReuse, showActions = true }: IMessageBubbleProps) {
  const { t, locale } = useLocale()
  const [copied, setCopied] = useState(false)

  if (message.id === WELCOME_MESSAGE_ID) {
    return (
      // Même largeur que sur la landing : le README qui glisse à l'ouverture se pose sans ressaut.
      <div data-testid="message-bubble" className="max-w-[644px]">
        <ReadmeCard content={message.content} />
      </div>
    )
  }

  const isUser = message.role === "user"
  const isError = !isUser && message.status === "error"
  const isEmpty = !message.content
  const showThinking = !isUser && isStreaming && isEmpty
  const showCursor = !isUser && isStreaming && !isEmpty
  const showSources = !isUser && !isStreaming && message.sources && message.sources.length > 0
  const canAct = showActions && !isStreaming && !isEmpty && !isError

  function handleCopy() {
    trackEvent("chat_message_copied", { role: message.role })
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReuse() {
    trackEvent("chat_message_reused")
    onReuse?.(message.content)
  }

  if (isUser) {
    return (
      <div data-testid="message-bubble" data-role="user" className="group/bubble flex items-baseline justify-between gap-4">
        <p className="min-w-0 text-[15px] leading-relaxed font-medium break-words text-ink">
          <span aria-hidden="true" className="mr-[1ch] text-teal-ink">
            &gt;
          </span>
          {message.content}
        </p>
        {canAct && onReuse && (
          <button
            data-testid="reuse-button"
            type="button"
            onClick={handleReuse}
            aria-label={t.chat.reuse}
            className={cn(ACTION_CLASS, "shrink-0 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/bubble:opacity-100 focus-visible:opacity-100")}
          >
            {t.chat.reuseLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <article data-testid="message-bubble" data-role="assistant" className="flex flex-col gap-2.5">
      <p className="text-[13px]">
        <span className="font-medium text-teal-ink">{ASSISTANT_NAME}</span>
        {" "}
        <span className="text-coral-ink">{isError ? t.chat.errorLabel : formatClock(new Date(message.createdAt), locale)}</span>
      </p>

      <div
        data-testid={isError ? "message-bubble-error" : undefined}
        className={cn("text-[15px] leading-[1.65] break-words", isError ? "text-ink" : "text-body", showCursor && "[&_[data-testid=markdown-content]>*:last-child]:inline")}
      >
        {showThinking ? (
          <ThinkingPhrase />
        ) : (
          <>
            <MarkdownMessage content={message.content} />
            {showCursor && <span data-testid="streaming-cursor" aria-hidden="true" className="cursor-block" />}
          </>
        )}
      </div>

      {showSources && (
        <p data-testid="message-sources" className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
          <span className="text-coral-ink">{t.chat.sourcesDir}</span>
          {message.sources!.map((s) =>
            s.url ? (
              <a key={s.source} href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent("chat_source_clicked", { source_label: s.label })} className="file-name hover:text-ink">
                {s.label}
              </a>
            ) : (
              <span key={s.source} className="file-name">
                {s.label}
              </span>
            ),
          )}
        </p>
      )}

      {canAct && (
        <p className="flex gap-5">
          <button data-testid="copy-button" type="button" onClick={handleCopy} aria-label={copied ? t.chat.copied : t.chat.copy} className={cn(ACTION_CLASS, copied && "text-teal-ink")}>
            {copied ? t.chat.copiedLabel : t.chat.copyLabel}
          </button>
        </p>
      )}
    </article>
  )
}

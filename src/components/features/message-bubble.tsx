import { cn } from "@/lib/utils"
import type { ISourceInfo } from "@/lib/stream-chat"

/**
 * Mapping des sources vers des URLs cliquables
 */
const SOURCE_URLS: Record<string, string> = {
  cv: "/cv_damien-pasulj.pdf",
}

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

export function MessageBubble({ message, isStreaming = false }: IMessageBubbleProps) {
  const isUser = message.role === "user"
  const isEmpty = !message.content
  const showSkeleton = !isUser && isStreaming && isEmpty
  const showCursor = !isUser && isStreaming && !isEmpty
  const showSources = !isUser && !isStreaming && message.sources && message.sources.length > 0

  return (
    <div data-testid="message-bubble" className={cn("flex w-full items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none", isUser ? "bg-white/10 text-white" : "bg-gradient-to-br from-[#E8A070] to-[#F9B288] text-white")}>
        {isUser ? "🫵" : "DP"}
      </div>

      <div
        className={cn(
          "break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed tracking-wide",
          showSkeleton ? "w-full" : "max-w-[75%]",
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
                  const url = SOURCE_URLS[s.source]
                  const baseClass =
                    "inline-flex items-center rounded-full border border-[#F9B288]/20 bg-[#F9B288]/5 px-2 py-0.5 text-[11px] font-medium text-[#F9B288]/80 transition-colors hover:border-[#F9B288]/40 hover:bg-[#F9B288]/10 hover:text-[#F9B288]"

                  return url ? (
                    <a key={s.source} href={url} target="_blank" rel="noopener noreferrer" className={cn(baseClass, "cursor-pointer underline decoration-[#F9B288]/30 underline-offset-2")}>
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
    </div>
  )
}

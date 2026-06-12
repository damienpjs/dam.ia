import { cn } from "@/lib/utils"

export interface IMessage {
  id: string
  content: string
  role: "user" | "assistant"
  createdAt: Date
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

  return (
    <div data-testid="message-bubble" className={cn("flex w-full items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none", isUser ? "bg-white/10 text-white" : "bg-gradient-to-br from-violet-500 to-orange-400 text-white")}>
        {isUser ? "🫵" : "DP"}
      </div>

      <div
        className={cn(
          "break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          showSkeleton ? "w-full" : "max-w-[75%]",
          isUser ? "rounded-br-sm bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-sm" : "rounded-bl-sm border border-border bg-card text-card-foreground",
        )}
      >
        {showSkeleton ? (
          <StreamingSkeleton />
        ) : (
          <>
            {message.content}
            {showCursor && <span data-testid="streaming-cursor" className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-text-bottom" />}
          </>
        )}
      </div>
    </div>
  )
}

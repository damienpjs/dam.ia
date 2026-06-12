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
}

export function MessageBubble({ message }: IMessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div data-testid="message-bubble" className={cn("flex w-full items-end gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div aria-hidden="true" className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none", isUser ? "bg-white/10 text-white" : "bg-gradient-to-br from-violet-500 to-orange-400 text-white")}>
        {isUser ? "T" : "AI"}
      </div>

      <div
        className={cn(
          "max-w-[75%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "rounded-br-sm bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-sm" : "rounded-bl-sm border border-border bg-card text-card-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

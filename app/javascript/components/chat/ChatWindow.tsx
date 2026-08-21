import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner, PendingLabel } from "@/components/ui/spinner"
import { MarkdownContent } from "./MarkdownContent"
import { ContextUsageMeter } from "./ContextUsageMeter"
import type { DisplayMessage } from "@/hooks/useChatStream"
import type { ChatUsage } from "@/api/chat"

export interface ChatWindowProps {
  messages: DisplayMessage[]
  streamingMessage: DisplayMessage | null
  isSending: boolean
  isLoadingHistory: boolean
  isCompacting: boolean
  notFound: boolean
  error: string | null
  usage: ChatUsage | null
  hasCompactionNotice: boolean
  onSend: (text: string) => void
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
            : "max-w-[80%] rounded-lg bg-muted px-3 py-2"
        }
      >
        {/* Only the live streamingMessage bubble can ever be empty — a
            completed message always has at least ChatController's fallback
            text — so this is "waiting on the first token", not a blank reply.
            No adjacent text here (unlike PendingLabel's other uses), so this
            is the one spot that needs its own accessible label. */}
        {message.content ? (
          <MarkdownContent content={message.content} />
        ) : (
          <Spinner role="status" aria-label="Waiting for reply" aria-hidden={undefined} />
        )}
      </div>
    </div>
  )
}

interface MessageListProps {
  messages: DisplayMessage[]
  streamingMessage: DisplayMessage | null
  isLoadingHistory: boolean
  isCompacting: boolean
  notFound: boolean
}

function MessageList({ messages, streamingMessage, isLoadingHistory, isCompacting, notFound }: MessageListProps) {
  const isEmpty = messages.length === 0 && !streamingMessage

  if (notFound) {
    return <p className="text-destructive">This conversation couldn&apos;t be found.</p>
  }

  return (
    <>
      {isLoadingHistory && (
        <p className="text-muted-foreground">
          <PendingLabel>Loading…</PendingLabel>
        </p>
      )}
      {!isLoadingHistory && isEmpty && (
        <p className="text-muted-foreground">Ask the assistant to create, update, or complete a task.</p>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isCompacting && <p className="text-sm text-muted-foreground italic">Compacting earlier messages to make room…</p>}
      {streamingMessage && !isCompacting && <MessageBubble message={streamingMessage} />}
    </>
  )
}

export function ChatWindow({
  messages,
  streamingMessage,
  isSending,
  isLoadingHistory,
  isCompacting,
  notFound,
  error,
  usage,
  hasCompactionNotice,
  onSend,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, streamingMessage?.content])

  function submitDraft() {
    if (draft.trim() === "") return
    onSend(draft)
    setDraft("")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    submitDraft()
  }

  return (
    <div className="flex flex-col rounded-lg border">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Chat</h2>
      </div>

      <div className="flex h-96 flex-col gap-2 overflow-y-auto p-3">
        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isLoadingHistory={isLoadingHistory}
          isCompacting={isCompacting}
          notFound={notFound}
        />
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-3 pb-2 text-sm text-destructive">{error}</p>}

      <ContextUsageMeter usage={usage} hasCompactionNotice={hasCompactionNotice} />

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the assistant to create, update, or complete a task…"
          disabled={isSending || notFound}
          className="flex-1"
        />
        <Button onClick={submitDraft} disabled={isSending || notFound || draft.trim() === ""}>
          Send
        </Button>
      </div>
    </div>
  )
}

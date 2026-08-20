import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import type { DisplayMessage } from "@/hooks/useChatStream"

export interface ChatWindowProps {
  messages: DisplayMessage[]
  streamingMessage: DisplayMessage | null
  isSending: boolean
  error: string | null
  onSend: (text: string) => void
  onClear: () => void
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
            : "max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm"
        }
      >
        {message.content}
      </div>
    </div>
  )
}

export function ChatWindow({ messages, streamingMessage, isSending, error, onSend, onClear }: ChatWindowProps) {
  const [draft, setDraft] = useState("")
  const [clearOpen, setClearOpen] = useState(false)
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
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    submitDraft()
  }

  function handleClearConfirm() {
    onClear()
    setClearOpen(false)
  }

  const hasContent = messages.length > 0 || streamingMessage !== null

  return (
    <div className="flex flex-col rounded-lg border">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Chat</h2>
        <ConfirmDialog
          open={clearOpen}
          onOpenChange={setClearOpen}
          trigger={<Button variant="outline" size="sm" aria-label="Clear conversation" disabled={!hasContent} />}
          triggerContent="Clear"
          title="Clear this conversation?"
          description="This can't be undone — the conversation isn't saved."
          confirmLabel="Clear"
          onConfirm={handleClearConfirm}
        />
      </div>

      <div className="flex h-96 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 && !streamingMessage && (
          <p className="text-muted-foreground">Ask the assistant to create, update, or complete a task.</p>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {streamingMessage && <MessageBubble message={streamingMessage} />}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-3 pb-2 text-sm text-destructive">{error}</p>}

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the assistant to create, update, or complete a task…"
          disabled={isSending}
          className="flex-1"
        />
        <Button onClick={submitDraft} disabled={isSending || draft.trim() === ""}>
          Send
        </Button>
      </div>
    </div>
  )
}

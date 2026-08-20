import { useChatStream } from "@/hooks/useChatStream"
import { ChatWindow } from "./ChatWindow"
import { ChangesList } from "./ChangesList"

export function ChatPage() {
  const chat = useChatStream()

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-4 md:grid-cols-[2fr_1fr]">
      <ChatWindow
        messages={chat.messages}
        streamingMessage={chat.streamingMessage}
        isSending={chat.isSending}
        error={chat.error}
        onSend={chat.sendMessage}
        onClear={chat.clear}
      />
      <div>
        <h2 className="mb-2 text-sm font-semibold">Recent changes</h2>
        <ChangesList changes={chat.changes} />
      </div>
    </div>
  )
}

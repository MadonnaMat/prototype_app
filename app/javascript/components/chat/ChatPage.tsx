import { useParams } from "react-router"
import { useChatStream } from "@/hooks/useChatStream"
import { ConversationSidebar } from "./ConversationSidebar"
import { ChatWindow } from "./ChatWindow"
import { ChangesList } from "./ChangesList"

function ChatPageContent({ conversationId }: { conversationId?: string }) {
  const chat = useChatStream(conversationId)

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[16rem_2fr_1fr]">
      <ConversationSidebar activeConversationId={conversationId} />
      <ChatWindow
        messages={chat.messages}
        streamingMessage={chat.streamingMessage}
        isSending={chat.isSending}
        isLoadingHistory={chat.isLoadingHistory}
        isCompacting={chat.isCompacting}
        notFound={chat.notFound}
        error={chat.error}
        usage={chat.usage}
        compactionNotice={chat.compactionNotice}
        onSend={chat.sendMessage}
      />
      <div>
        <h2 className="mb-2 text-sm font-semibold">Recent changes</h2>
        <ChangesList changes={chat.changes} />
      </div>
    </div>
  )
}

export function ChatPage() {
  const { conversationId } = useParams()

  // Keying on conversationId forces a full remount (fresh reducer state,
  // fresh hydration fetch, in-flight stream aborted via useChatStream's
  // own unmount cleanup) whenever the user switches conversations or
  // starts a new one, instead of hand-writing an effect to reset state.
  return <ChatPageContent key={conversationId ?? "new"} conversationId={conversationId} />
}

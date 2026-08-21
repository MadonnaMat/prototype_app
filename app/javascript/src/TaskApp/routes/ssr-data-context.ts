import { createContext, useContext } from "react"
import type { Task } from "@/api/tasks"
import type { Conversation, ConversationDetail } from "@/api/conversations"

export interface SsrData {
  initialTasks?: Task[]
  initialTask?: Task
  initialConversations?: Conversation[]
  initialConversation?: ConversationDetail
}

export const SsrDataContext = createContext<SsrData>({})

export function useSsrData(): SsrData {
  return useContext(SsrDataContext)
}

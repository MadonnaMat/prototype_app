import { useQuery, type Query } from "@tanstack/react-query"
import { listConversations, getConversation, type Conversation, type ConversationDetail } from "@/api/conversations"

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  detail: (id: number | string) => [...conversationKeys.all, "detail", String(id)] as const,
}

// Titles start as a synchronous placeholder (see ChatController) and get
// replaced shortly after by GenerateConversationTitleJob — poll the list
// while any conversation is still waiting on that, and stop the moment
// none are, rather than polling indefinitely.
function refetchWhileTitlesPending(query: Query<Conversation[]>) {
  return query.state.data?.some((conversation) => !conversation.title_generated) ? 2000 : false
}

export function useConversationsQuery(initialData?: Conversation[]) {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: listConversations,
    initialData,
    refetchInterval: refetchWhileTitlesPending,
  })
}

export function useConversationQuery(id: string | undefined, initialData?: ConversationDetail) {
  return useQuery({
    queryKey: conversationKeys.detail(id ?? ""),
    queryFn: () => getConversation(id as string),
    initialData,
    enabled: id !== undefined,
  })
}

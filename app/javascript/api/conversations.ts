import type { paths } from "@/types/api"
import { apiRequest } from "./client"

type ConversationListBody = paths["/api/conversations"]["get"]["responses"][200]["content"]["application/json"]
type ConversationShowBody = paths["/api/conversations/{id}"]["get"]["responses"][200]["content"]["application/json"]
type ConversationUpdateBody = paths["/api/conversations/{id}"]["patch"]["responses"][200]["content"]["application/json"]

export type Conversation = NonNullable<ConversationListBody["conversations"]>[number]
export type ConversationDetail = NonNullable<ConversationShowBody["conversation"]>

export function listConversations(): Promise<Conversation[]> {
  return apiRequest<ConversationListBody>("/conversations").then((body) => body.conversations ?? [])
}

export function getConversation(id: number | string): Promise<ConversationDetail> {
  return apiRequest<ConversationShowBody>(`/conversations/${id}`).then((body) => body.conversation as ConversationDetail)
}

export function renameConversation(id: number | string, title: string): Promise<Conversation> {
  return apiRequest<ConversationUpdateBody>(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ conversation: { title } }),
  }).then((body) => body.conversation as Conversation)
}

export function deleteConversation(id: number | string): Promise<void> {
  return apiRequest(`/conversations/${id}`, { method: "DELETE" }).then(() => undefined)
}

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { renameConversation, deleteConversation } from "@/api/conversations"
import { conversationKeys } from "./useConversationQueries"

interface RenameConversationVariables {
  id: number | string
  title: string
}

export function useRenameConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, title }: RenameConversationVariables) => renameConversation(id, title),
    onSettled: (_data, _error, { id }: RenameConversationVariables) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) })
    },
  })
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}

import { useState, type KeyboardEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PendingLabel } from "@/components/ui/spinner"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { useConversationsQuery } from "@/hooks/useConversationQueries"
import { useRenameConversationMutation, useDeleteConversationMutation } from "@/hooks/useConversationMutations"
import { useSsrData } from "@/src/TaskApp/routes/ssr-data-context"
import type { Conversation } from "@/api/conversations"

interface ConversationRowProps {
  conversation: Conversation
  isActive: boolean
}

function ConversationRow({ conversation, isActive }: ConversationRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(conversation.title)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const navigate = useNavigate()
  const renameMutation = useRenameConversationMutation()
  const deleteMutation = useDeleteConversationMutation()

  function startEditing() {
    setTitle(conversation.title)
    setIsEditing(true)
  }

  function commitRename() {
    setIsEditing(false)
    const trimmed = title.trim()
    if (trimmed === "" || trimmed === conversation.title) return
    renameMutation.mutate({ id: conversation.id, title: trimmed })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commitRename()
    if (event.key === "Escape") {
      setTitle(conversation.title)
      setIsEditing(false)
    }
  }

  function handleDeleteConfirm() {
    deleteMutation.mutate(conversation.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        if (isActive) navigate("/assistant")
      },
    })
  }

  const rowClassName = isActive ? "flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5" : "flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-muted"

  if (isEditing) {
    return (
      <div className={rowClassName}>
        <Input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          className="h-6 flex-1 text-sm"
          aria-label={`Rename "${conversation.title}"`}
        />
      </div>
    )
  }

  return (
    <div className={rowClassName}>
      <Link to={`/assistant/${conversation.id}`} aria-current={isActive ? "page" : undefined} className="flex-1 truncate text-sm">
        {conversation.title}
      </Link>
      <Button variant="ghost" size="icon-xs" aria-label={`Rename "${conversation.title}"`} onClick={startEditing}>
        <Pencil />
      </Button>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trigger={<Button variant="ghost" size="icon-xs" aria-label={`Delete "${conversation.title}"`} />}
        triggerContent={<Trash2 />}
        title={`Delete "${conversation.title}"?`}
        description="This can't be undone."
        confirmLabel={deleteMutation.isPending ? <PendingLabel>Deleting…</PendingLabel> : "Delete"}
        confirmDisabled={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export interface ConversationSidebarProps {
  activeConversationId?: string
}

export function ConversationSidebar({ activeConversationId }: ConversationSidebarProps) {
  const { initialConversations } = useSsrData()
  const { data: conversations = [] } = useConversationsQuery(initialConversations)

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border p-2">
      <Link to="/assistant" className="rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted">
        + New chat
      </Link>
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {conversations.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No conversations yet.</p>}
        {conversations.map((conversation) => (
          <ConversationRow key={conversation.id} conversation={conversation} isActive={String(conversation.id) === activeConversationId} />
        ))}
      </div>
    </div>
  )
}

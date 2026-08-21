import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PendingLabel } from "@/components/ui/spinner"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { useDeleteTaskMutation } from "@/hooks/useTaskMutations"
import type { Task } from "@/api/tasks"

export interface DeleteTaskDialogProps {
  task: Task
}

export function DeleteTaskDialog({ task }: DeleteTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const deleteMutation = useDeleteTaskMutation()

  function handleConfirm() {
    deleteMutation.mutate(task.id, { onSuccess: () => setOpen(false) })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="destructive" size="icon-sm" aria-label={`Delete "${task.title}"`} />}
      triggerContent={<Trash2 />}
      title={`Delete "${task.title}"?`}
      description="This can't be undone."
      confirmLabel={deleteMutation.isPending ? <PendingLabel>Deleting…</PendingLabel> : "Delete"}
      confirmDisabled={deleteMutation.isPending}
      onConfirm={handleConfirm}
    />
  )
}

import { Link } from "react-router"
import { Checkbox } from "@/components/ui/checkbox"
import { useUpdateTaskMutation } from "@/hooks/useTaskMutations"
import { useAuth } from "@/contexts/AuthContext"
import type { Task } from "@/api/tasks"
import { DeleteTaskDialog } from "./DeleteTaskDialog"

export interface TaskRowProps {
  task: Task
}

export function TaskRow({ task }: TaskRowProps) {
  const { user } = useAuth()
  const updateMutation = useUpdateTaskMutation()
  const isForeign = task.owner_username !== user?.username

  function handleToggleDone(done: boolean) {
    updateMutation.mutate({
      id: task.id,
      data: { title: task.title, description: task.description ?? "", done, is_public: task.is_public },
    })
  }

  const titleClassName = task.done ? "flex-1 text-muted-foreground line-through" : "flex-1"

  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        checked={task.done}
        onCheckedChange={isForeign ? undefined : handleToggleDone}
        disabled={isForeign}
        aria-label={`Mark "${task.title}" as ${task.done ? "incomplete" : "complete"}`}
      />
      {/* Foreign tasks (someone else's public task) are read-only here — there's no
          view-only page, and the server rejects edits/deletes from a non-owner with
          403, so editing/deleting controls are only offered for tasks you own. */}
      {isForeign ? (
        <span className={titleClassName}>{task.title}</span>
      ) : (
        <Link to={`/tasks/${task.id}/edit`} className={titleClassName}>
          {task.title}
        </Link>
      )}
      {isForeign && <span className="text-xs text-muted-foreground">from: {task.owner_username}</span>}
      {!isForeign && <DeleteTaskDialog task={task} />}
    </div>
  )
}

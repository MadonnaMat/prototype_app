import { Link } from "react-router"
import { Checkbox } from "@/components/ui/checkbox"
import { useUpdateTaskMutation } from "@/hooks/useTaskMutations"
import type { Task } from "@/api/tasks"
import { DeleteTaskDialog } from "./DeleteTaskDialog"

export interface TaskRowProps {
  task: Task
}

export function TaskRow({ task }: TaskRowProps) {
  const updateMutation = useUpdateTaskMutation()

  function handleToggleDone(done: boolean) {
    updateMutation.mutate({
      id: task.id,
      data: { title: task.title, description: task.description ?? "", done },
    })
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        checked={task.done}
        onCheckedChange={handleToggleDone}
        aria-label={`Mark "${task.title}" as ${task.done ? "incomplete" : "complete"}`}
      />
      <Link
        to={`/tasks/${task.id}/edit`}
        className={task.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}
      >
        {task.title}
      </Link>
      <DeleteTaskDialog task={task} />
    </div>
  )
}

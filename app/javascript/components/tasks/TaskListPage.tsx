import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useTasksQuery } from "@/hooks/useTaskQueries"
import { useSsrData } from "@/src/TaskApp/routes/ssr-data-context"
import type { Task } from "@/api/tasks"
import { TaskRow } from "./TaskRow"

interface TaskListBodyProps {
  tasks?: Task[]
  isPending: boolean
  isError: boolean
}

function TaskListBody({ tasks, isPending, isError }: TaskListBodyProps) {
  if (isPending) return <p>Loading…</p>
  if (isError) return <p className="text-destructive">Failed to load tasks.</p>
  if (!tasks || tasks.length === 0) return <p className="text-muted-foreground">No tasks yet.</p>

  return (
    <div className="divide-y">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  )
}

export function TaskListPage() {
  const { initialTasks } = useSsrData()
  const tasksQuery = useTasksQuery(initialTasks)

  return (
    <div className="mx-auto max-w-lg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <Button render={<Link to="/tasks/new" />}>New Task</Button>
      </div>
      <TaskListBody tasks={tasksQuery.data} isPending={tasksQuery.isPending} isError={tasksQuery.isError} />
    </div>
  )
}

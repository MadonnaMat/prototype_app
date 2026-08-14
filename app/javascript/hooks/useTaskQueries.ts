import { useQuery } from "@tanstack/react-query"
import { listTasks, getTask, type Task } from "@/api/tasks"

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  detail: (id: number | string) => [...taskKeys.all, "detail", String(id)] as const,
}

export function useTasksQuery(initialData?: Task[]) {
  return useQuery({ queryKey: taskKeys.lists(), queryFn: listTasks, initialData })
}

export function useTaskQuery(id: number | string, initialData?: Task) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => getTask(id),
    initialData,
    enabled: id !== "",
  })
}

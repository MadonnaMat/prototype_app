import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createTask, updateTask, deleteTask, type Task, type TaskInput } from "@/api/tasks"
import { taskKeys } from "./useTaskQueries"

export function useCreateTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TaskInput) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

interface UpdateTaskVariables {
  id: number | string
  data: TaskInput
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: UpdateTaskVariables) => updateTask(id, data),
    onMutate: async ({ id, data }: UpdateTaskVariables) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
      const previous = queryClient.getQueryData<Task[]>(taskKeys.lists())
      if (previous) {
        queryClient.setQueryData<Task[]>(
          taskKeys.lists(),
          previous.map((task) => (task.id === id ? { ...task, ...data } : task))
        )
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(taskKeys.lists(), context.previous)
      }
    },
    onSettled: (_data, _error, { id }: UpdateTaskVariables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
    },
  })
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}

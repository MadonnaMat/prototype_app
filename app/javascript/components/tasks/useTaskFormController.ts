import { useNavigate } from "react-router"
import { toast } from "sonner"
import { useTaskQuery } from "@/hooks/useTaskQueries"
import { useCreateTaskMutation, useUpdateTaskMutation } from "@/hooks/useTaskMutations"
import { useSsrData } from "@/src/TaskApp/routes/ssr-data-context"
import { ApiValidationError, ApiRequestError } from "@/api/client"
import type { Task, TaskInput } from "@/api/tasks"

// Only trust SSR-seeded data when it's actually for the route we're on -- it stays
// fixed for the whole app lifetime, so a client-side nav to a different task's edit
// page must fall through to a real fetch instead of flashing the previous task's data.
function ssrInitialDataFor(id: string | undefined, initialTask: Task | undefined) {
  return initialTask && String(initialTask.id) === id ? initialTask : undefined
}

function classifyLoadError(isError: boolean, error: unknown) {
  if (!isError) return { notFound: false, loadError: false }
  const notFound = error instanceof ApiRequestError && error.status === 404
  return { notFound, loadError: !notFound }
}

export function useTaskFormController(id?: string) {
  const isEdit = id !== undefined
  const { initialTask } = useSsrData()
  const taskQuery = useTaskQuery(id ?? "", ssrInitialDataFor(id, initialTask))
  const createMutation = useCreateTaskMutation()
  const updateMutation = useUpdateTaskMutation()
  const navigate = useNavigate()
  const mutation = isEdit ? updateMutation : createMutation

  function onSubmit(values: TaskInput) {
    const onSuccess = () => {
      toast.success(isEdit ? "Task updated" : "Task created")
      navigate("/")
    }
    if (id !== undefined) {
      updateMutation.mutate({ id, data: values }, { onSuccess })
    } else {
      createMutation.mutate(values, { onSuccess })
    }
  }

  const { notFound, loadError } = classifyLoadError(isEdit && taskQuery.isError, taskQuery.error)

  return {
    isReady: !isEdit || taskQuery.isSuccess,
    notFound,
    loadError,
    initialValues: isEdit ? taskQuery.data : undefined,
    onSubmit,
    isSubmitting: mutation.isPending,
    fieldErrors: mutation.error instanceof ApiValidationError ? mutation.error.errors : undefined,
    submitError: mutation.error instanceof ApiRequestError ? mutation.error.message : undefined,
  }
}

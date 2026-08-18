import { useNavigate } from "react-router"
import { toast } from "sonner"
import { useTaskQuery } from "@/hooks/useTaskQueries"
import { useCreateTaskMutation, useUpdateTaskMutation } from "@/hooks/useTaskMutations"
import { useSsrData } from "@/src/TaskApp/routes/ssr-data-context"
import { useAuth } from "@/contexts/AuthContext"
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

// The server allows GET on any visible (owned-or-public) task, so a foreign
// public task's edit page would otherwise render fully editable and only
// fail once the user tries to save (403). Gate it upfront too — this route
// only ever mounts under RequireAuth, so `user` is already resolved by the
// time we get here, but guard authLoading anyway so an own task can't
// briefly flash forbidden while `user` is still null.
function isForeignTask(taskReady: boolean, authLoading: boolean, task: Task | undefined, username: string | undefined) {
  if (!taskReady || authLoading) return false
  return task?.owner_username !== username
}

export function useTaskFormController(id?: string) {
  const isEdit = id !== undefined
  const { initialTask } = useSsrData()
  const { user, isLoading: authLoading } = useAuth()
  const taskQuery = useTaskQuery(id ?? "", ssrInitialDataFor(id, initialTask))
  const createMutation = useCreateTaskMutation()
  const updateMutation = useUpdateTaskMutation()
  const navigate = useNavigate()
  const mutation = isEdit ? updateMutation : createMutation
  const taskReady = isEdit && taskQuery.isSuccess
  const isForbidden = isForeignTask(taskReady, authLoading, taskQuery.data, user?.username)

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
    isReady: !isEdit || taskReady,
    notFound,
    loadError,
    isForbidden,
    initialValues: isEdit ? taskQuery.data : undefined,
    onSubmit,
    isSubmitting: mutation.isPending,
    fieldErrors: mutation.error instanceof ApiValidationError ? mutation.error.errors : undefined,
    submitError: mutation.error instanceof ApiRequestError ? mutation.error.message : undefined,
  }
}

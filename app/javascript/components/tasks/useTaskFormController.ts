import { useNavigate } from "react-router"
import { toast } from "sonner"
import { useTaskQuery } from "@/hooks/useTaskQueries"
import { useCreateTaskMutation, useUpdateTaskMutation } from "@/hooks/useTaskMutations"
import { useSsrData } from "@/src/TaskApp/routes/ssr-data-context"
import { ApiValidationError, ApiRequestError } from "@/api/client"
import type { TaskInput } from "@/api/tasks"

export function useTaskFormController(id?: string) {
  const isEdit = id !== undefined
  const { initialTask } = useSsrData()
  const taskQuery = useTaskQuery(id ?? "", initialTask)
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

  return {
    isReady: !isEdit || taskQuery.isSuccess,
    notFound: isEdit && taskQuery.isError,
    initialValues: isEdit ? taskQuery.data : undefined,
    onSubmit,
    isSubmitting: mutation.isPending,
    fieldErrors: mutation.error instanceof ApiValidationError ? mutation.error.errors : undefined,
    submitError: mutation.error instanceof ApiRequestError ? mutation.error.message : undefined,
  }
}

import { useParams, useNavigate, Link } from "react-router"
import { TaskForm } from "./TaskForm"
import { useTaskFormController } from "./useTaskFormController"

export function TaskFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { isReady, notFound, loadError, isForbidden, initialValues, onSubmit, isSubmitting, fieldErrors, submitError } =
    useTaskFormController(id)

  if (isForbidden) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <p className="mb-4">This task belongs to someone else and can&apos;t be edited.</p>
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Back to tasks
        </Link>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <p className="mb-4">Task not found.</p>
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Back to tasks
        </Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <p className="mb-4">Something went wrong loading this task.</p>
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Back to tasks
        </Link>
      </div>
    )
  }

  if (!isReady) {
    return <div className="mx-auto max-w-lg p-4">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-4 text-xl font-semibold">{id ? "Edit task" : "New task"}</h1>
      {submitError && <p className="mb-4 text-sm text-destructive">{submitError}</p>}
      <TaskForm
        initialValues={initialValues}
        onSubmit={onSubmit}
        onCancel={() => navigate("/")}
        isSubmitting={isSubmitting}
        fieldErrors={fieldErrors}
        submitLabel={id ? "Save changes" : "Create task"}
      />
    </div>
  )
}

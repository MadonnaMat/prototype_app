import { useCallback, useState, type FormEvent } from "react"
import { useBeforeUnload } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import type { TaskInput } from "@/api/tasks"

export interface TaskFormValues {
  title: string
  description: string
  done: boolean
}

export interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>
  onSubmit: (values: TaskInput) => void
  onCancel?: () => void
  isSubmitting?: boolean
  fieldErrors?: Record<string, string[]>
  submitLabel?: string
}

function useTaskFormFields(initialValues?: Partial<TaskFormValues>) {
  const [title, setTitle] = useState(initialValues?.title ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [done, setDone] = useState(initialValues?.done ?? false)
  return { title, setTitle, description, setDescription, done, setDone }
}

function isDirty(current: TaskFormValues, initialValues?: Partial<TaskFormValues>) {
  return (
    current.title !== (initialValues?.title ?? "") ||
    current.description !== (initialValues?.description ?? "") ||
    current.done !== (initialValues?.done ?? false)
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages) return null
  return <p className="text-sm text-destructive">{messages.join(", ")}</p>
}

export function TaskForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  fieldErrors,
  submitLabel = "Save",
}: TaskFormProps) {
  const { title, setTitle, description, setDescription, done, setDone } = useTaskFormFields(initialValues)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const dirty = isDirty({ title, description, done }, initialValues)

  // Guards tab close / refresh / typing a new URL. Doesn't cover the browser's
  // back/forward button -- that requires React Router's data-router-only useBlocker,
  // which we can't adopt without giving up the SSR-verified Declarative Mode setup.
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!dirty) return
        event.preventDefault()
        event.returnValue = ""
      },
      [dirty]
    )
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ title, description, done })
  }

  function handleCancelClick() {
    if (dirty) {
      setConfirmOpen(true)
    } else {
      onCancel?.()
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-title">Title</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={Boolean(fieldErrors?.title)}
          />
          <FieldError messages={fieldErrors?.title} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-description">Description</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="task-done" checked={done} onCheckedChange={setDone} />
          <Label htmlFor="task-done">Completed</Label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={handleCancelClick}>
              Back
            </Button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Discard changes?"
        description="You have unsaved changes. Going back will discard them."
        confirmLabel="Discard"
        onConfirm={() => {
          setConfirmOpen(false)
          onCancel?.()
        }}
      />
    </>
  )
}

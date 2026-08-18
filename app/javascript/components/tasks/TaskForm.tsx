import { useCallback, useState, type SubmitEvent } from "react"
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
  is_public: boolean
}

export interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>
  onSubmit: (values: TaskInput) => void
  onCancel?: () => void
  isSubmitting?: boolean
  fieldErrors?: Record<string, string[]>
  submitLabel?: string
}

function normalizeValues(initialValues?: Partial<TaskFormValues>): TaskFormValues {
  return {
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    done: initialValues?.done ?? false,
    is_public: initialValues?.is_public ?? false,
  }
}

function useTaskFormFields(initialValues?: Partial<TaskFormValues>) {
  const defaults = normalizeValues(initialValues)
  const [title, setTitle] = useState(defaults.title)
  const [description, setDescription] = useState(defaults.description)
  const [done, setDone] = useState(defaults.done)
  const [isPublic, setIsPublic] = useState(defaults.is_public)
  return { title, setTitle, description, setDescription, done, setDone, isPublic, setIsPublic }
}

function isDirty(current: TaskFormValues, initialValues?: Partial<TaskFormValues>) {
  const initial = normalizeValues(initialValues)
  return (
    current.title !== initial.title ||
    current.description !== initial.description ||
    current.done !== initial.done ||
    current.is_public !== initial.is_public
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
  const { title, setTitle, description, setDescription, done, setDone, isPublic, setIsPublic } =
    useTaskFormFields(initialValues)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const dirty = isDirty({ title, description, done, is_public: isPublic }, initialValues)

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

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ title, description, done, is_public: isPublic })
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

        <div className="flex items-center gap-2">
          <Checkbox id="task-is-public" checked={isPublic} onCheckedChange={setIsPublic} />
          <Label htmlFor="task-is-public">Public (visible to everyone)</Label>
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

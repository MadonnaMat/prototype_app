import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TaskForm } from "./TaskForm"

describe("TaskForm", () => {
  it("renders empty fields by default", () => {
    render(<TaskForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText("Title")).toHaveValue("")
    expect(screen.getByLabelText("Description")).toHaveValue("")
    expect(screen.getByRole("checkbox", { name: "Completed" })).not.toBeChecked()
  })

  it("prefills fields from initialValues", () => {
    render(
      <TaskForm initialValues={{ title: "Existing", description: "Some notes", done: true }} onSubmit={vi.fn()} />
    )

    expect(screen.getByLabelText("Title")).toHaveValue("Existing")
    expect(screen.getByLabelText("Description")).toHaveValue("Some notes")
    expect(screen.getByRole("checkbox", { name: "Completed" })).toBeChecked()
  })

  it("calls onSubmit with the current field values", () => {
    const handleSubmit = vi.fn()
    render(<TaskForm onSubmit={handleSubmit} />)

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New title" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "New description" } })
    fireEvent.click(screen.getByRole("checkbox", { name: "Completed" }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(handleSubmit).toHaveBeenCalledWith({
      title: "New title",
      description: "New description",
      done: true,
    })
  })

  it("renders inline field errors", () => {
    render(<TaskForm onSubmit={vi.fn()} fieldErrors={{ title: ["can't be blank"] }} />)

    expect(screen.getByText("can't be blank")).toBeInTheDocument()
  })

  it("disables the submit button while submitting", () => {
    render(<TaskForm onSubmit={vi.fn()} isSubmitting />)

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled()
  })

  it("does not render a Back button when onCancel is not provided", () => {
    render(<TaskForm onSubmit={vi.fn()} />)

    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument()
  })

  it("calls onCancel directly when there are no edits", () => {
    const onCancel = vi.fn()
    render(<TaskForm initialValues={{ title: "Existing" }} onSubmit={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(onCancel).toHaveBeenCalled()
    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument()
  })

  it("asks for confirmation before discarding edits", () => {
    const onCancel = vi.fn()
    render(<TaskForm initialValues={{ title: "Existing" }} onSubmit={vi.fn()} onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Changed" } })
    fireEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(screen.getByText("Discard changes?")).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("calls onCancel after confirming the discard", () => {
    const onCancel = vi.fn()
    render(<TaskForm initialValues={{ title: "Existing" }} onSubmit={vi.fn()} onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Changed" } })
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    fireEvent.click(screen.getByRole("button", { name: "Discard" }))

    expect(onCancel).toHaveBeenCalled()
  })

  it("does not call onCancel when the discard is cancelled", () => {
    const onCancel = vi.fn()
    render(<TaskForm initialValues={{ title: "Existing" }} onSubmit={vi.fn()} onCancel={onCancel} />)

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Changed" } })
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Title")).toHaveValue("Changed")
  })
})

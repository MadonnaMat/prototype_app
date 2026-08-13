import { describe, it, expect } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import { Routes, Route } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { TaskListPage } from "./TaskListPage"
import { TaskFormPage } from "./TaskFormPage"

function renderPage(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<TaskListPage />} />
      <Route path="/tasks/new" element={<TaskFormPage />} />
      <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
    </Routes>,
    { route }
  )
}

describe("TaskFormPage", () => {
  it("renders an empty create form at /tasks/new", () => {
    renderPage("/tasks/new")

    expect(screen.getByRole("heading", { name: "New task" })).toBeInTheDocument()
    expect(screen.getByLabelText("Title")).toHaveValue("")
  })

  it("submits a new task via the create endpoint", async () => {
    let capturedBody: unknown
    server.use(
      http.post("/api/tasks", async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          {
            task: { id: 42, title: "Fresh task", description: "", done: false, created_at: "", updated_at: "" },
            meta: { success: true },
          },
          { status: 201 }
        )
      })
    )
    renderPage("/tasks/new")

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Fresh task" } })
    fireEvent.click(screen.getByRole("button", { name: "Create task" }))

    await waitFor(() =>
      expect(capturedBody).toEqual({ task: { title: "Fresh task", description: "", done: false } })
    )
  })

  it("shows a loading state, then prefills the form at /tasks/:id/edit", async () => {
    renderPage("/tasks/5/edit")

    expect(screen.getByText("Loading…")).toBeInTheDocument()

    await waitFor(() => expect(screen.getByRole("heading", { name: "Edit task" })).toBeInTheDocument())
    expect(screen.getByLabelText("Title")).toHaveValue("Write project proposal")
  })

  it("shows a not-found state for a missing task", async () => {
    server.use(
      http.get("/api/tasks/:id", () =>
        HttpResponse.json({ meta: { success: false, error: "Not found" } }, { status: 404 })
      )
    )
    renderPage("/tasks/999/edit")

    await waitFor(() => expect(screen.getByText("Task not found.")).toBeInTheDocument())
  })

  it("renders inline validation errors from the server", async () => {
    server.use(
      http.post("/api/tasks", () =>
        HttpResponse.json({ meta: { success: false, errors: { title: ["can't be blank"] } } }, { status: 422 })
      )
    )
    renderPage("/tasks/new")

    fireEvent.click(screen.getByRole("button", { name: "Create task" }))

    await waitFor(() => expect(screen.getByText("can't be blank")).toBeInTheDocument())
  })

  it("navigates back to the list when Back is clicked with no edits", async () => {
    renderPage("/tasks/new")

    fireEvent.click(screen.getByRole("button", { name: "Back" }))

    await waitFor(() => expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument())
  })

  it("confirms before discarding edits, then navigates back to the list", async () => {
    renderPage("/tasks/new")

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Unsaved" } })
    fireEvent.click(screen.getByRole("button", { name: "Back" }))

    expect(screen.getByText("Discard changes?")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Discard" }))

    await waitFor(() => expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument())
  })
})

import { describe, it, expect } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { buildTask } from "@/test/msw/handlers"
import { TaskRow } from "./TaskRow"

describe("TaskRow", () => {
  it("renders the task title as a link to its edit page", () => {
    renderWithProviders(<TaskRow task={buildTask({ id: 3, title: "Buy groceries" })} />)

    expect(screen.getByRole("link", { name: "Buy groceries" })).toHaveAttribute("href", "/tasks/3/edit")
  })

  it("shows the title with a strikethrough style when done", () => {
    renderWithProviders(<TaskRow task={buildTask({ done: true, title: "Done task" })} />)

    expect(screen.getByRole("link", { name: "Done task" })).toHaveClass("line-through")
  })

  it("calls the update endpoint with the toggled done state when the checkbox is clicked", async () => {
    let capturedBody: unknown
    server.use(
      http.patch("/api/tasks/:id", async ({ request, params }) => {
        capturedBody = await request.json()
        return HttpResponse.json(
          { task: buildTask({ id: Number(params.id), done: true }), meta: { success: true } },
          { status: 200 }
        )
      })
    )
    renderWithProviders(<TaskRow task={buildTask({ id: 1, title: "Toggle me", description: "", done: false })} />)

    fireEvent.click(screen.getByRole("checkbox"))

    await waitFor(() =>
      expect(capturedBody).toEqual({ task: { title: "Toggle me", description: "", done: true } })
    )
  })

  it("renders a delete trigger for the task", () => {
    renderWithProviders(<TaskRow task={buildTask({ title: "Deletable" })} />)

    expect(screen.getByRole("button", { name: 'Delete "Deletable"' })).toBeInTheDocument()
  })
})

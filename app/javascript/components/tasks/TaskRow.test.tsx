import { describe, it, expect } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { buildTask } from "@/test/msw/handlers"
import { TaskRow } from "./TaskRow"

describe("TaskRow", () => {
  it("renders the task title as a link to its edit page", async () => {
    renderWithProviders(<TaskRow task={buildTask({ id: 3, title: "Buy groceries" })} />)

    expect(await screen.findByRole("link", { name: "Buy groceries" })).toHaveAttribute("href", "/tasks/3/edit")
  })

  it("shows the title with a strikethrough style when done", async () => {
    renderWithProviders(<TaskRow task={buildTask({ done: true, title: "Done task" })} />)

    expect(await screen.findByRole("link", { name: "Done task" })).toHaveClass("line-through")
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
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled())

    fireEvent.click(screen.getByRole("checkbox"))

    await waitFor(() =>
      expect(capturedBody).toEqual({
        task: { title: "Toggle me", description: "", done: true, is_public: false },
      })
    )
  })

  it("renders a delete trigger for the task", async () => {
    renderWithProviders(<TaskRow task={buildTask({ title: "Deletable" })} />)

    expect(await screen.findByRole("button", { name: 'Delete "Deletable"' })).toBeInTheDocument()
  })

  it("does not show an owner badge for the current user's own task", async () => {
    renderWithProviders(<TaskRow task={buildTask({ owner_username: "testuser" })} />)

    await waitFor(() => expect(screen.queryByText(/from:/)).not.toBeInTheDocument())
  })

  it("shows a 'from' badge for someone else's public task", async () => {
    renderWithProviders(<TaskRow task={buildTask({ is_public: true, owner_username: "bob" })} />)

    await waitFor(() => expect(screen.getByText("from: bob")).toBeInTheDocument())
  })

  it("renders someone else's public task as read-only, with no edit link or delete/toggle controls", async () => {
    renderWithProviders(
      <TaskRow task={buildTask({ title: "Not mine", is_public: true, owner_username: "bob" })} />
    )

    await waitFor(() => expect(screen.getByText("from: bob")).toBeInTheDocument())
    expect(screen.queryByRole("link", { name: "Not mine" })).not.toBeInTheDocument()
    expect(screen.getByText("Not mine")).toBeInTheDocument()
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true")
    expect(screen.queryByRole("button", { name: 'Delete "Not mine"' })).not.toBeInTheDocument()
  })
})

import { describe, it, expect } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { buildTask } from "@/test/msw/handlers"
import { DeleteTaskDialog } from "./DeleteTaskDialog"

describe("DeleteTaskDialog", () => {
  it("does not show the confirmation dialog until the trigger is clicked", () => {
    renderWithProviders(<DeleteTaskDialog task={buildTask({ title: "Some task" })} />)

    expect(screen.queryByText('Delete "Some task"?')).not.toBeInTheDocument()
  })

  it("shows a confirmation dialog when the trigger is clicked", () => {
    renderWithProviders(<DeleteTaskDialog task={buildTask({ title: "Some task" })} />)

    fireEvent.click(screen.getByRole("button", { name: 'Delete "Some task"' }))

    expect(screen.getByText('Delete "Some task"?')).toBeInTheDocument()
  })

  it("does not call the delete endpoint until confirmed", () => {
    let deleteCalled = false
    server.use(
      http.delete("/api/tasks/:id", () => {
        deleteCalled = true
        return HttpResponse.json({ meta: { success: true } })
      })
    )
    renderWithProviders(<DeleteTaskDialog task={buildTask({ id: 1, title: "Some task" })} />)

    fireEvent.click(screen.getByRole("button", { name: 'Delete "Some task"' }))

    expect(deleteCalled).toBe(false)
  })

  it("calls the delete endpoint and closes the dialog when confirmed", async () => {
    renderWithProviders(<DeleteTaskDialog task={buildTask({ id: 1, title: "Some task" })} />)

    fireEvent.click(screen.getByRole("button", { name: 'Delete "Some task"' }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(screen.queryByText('Delete "Some task"?')).not.toBeInTheDocument())
  })
})

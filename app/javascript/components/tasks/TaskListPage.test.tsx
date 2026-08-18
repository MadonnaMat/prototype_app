import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { SsrDataContext } from "@/src/TaskApp/routes/ssr-data-context"
import { TaskListPage } from "./TaskListPage"

describe("TaskListPage", () => {
  it("shows a loading state before tasks arrive", () => {
    renderWithProviders(<TaskListPage />)

    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("renders the task list once loaded", async () => {
    renderWithProviders(<TaskListPage />)

    await waitFor(() => expect(screen.getByText("Write project proposal")).toBeInTheDocument())
  })

  it("renders an empty state when there are no tasks", async () => {
    server.use(http.get("/api/tasks", () => HttpResponse.json({ tasks: [], meta: { success: true } })))
    renderWithProviders(<TaskListPage />)

    await waitFor(() => expect(screen.getByText("No tasks yet.")).toBeInTheDocument())
  })

  it("renders an error state when the fetch fails", async () => {
    server.use(
      http.get("/api/tasks", () => HttpResponse.json({ meta: { success: false, error: "boom" } }, { status: 500 }))
    )
    renderWithProviders(<TaskListPage />)

    await waitFor(() => expect(screen.getByText("Failed to load tasks.")).toBeInTheDocument())
  })

  it("uses SSR-seeded tasks without waiting on a fetch", () => {
    renderWithProviders(
      <SsrDataContext.Provider
        value={{
          initialTasks: [
            {
              id: 99,
              title: "Seeded task",
              description: "",
              done: false,
              is_public: false,
              owner_username: "testuser",
              created_at: "",
              updated_at: "",
            },
          ],
        }}
      >
        <TaskListPage />
      </SsrDataContext.Provider>
    )

    expect(screen.getByText("Seeded task")).toBeInTheDocument()
  })

  it("links to the new task page", async () => {
    renderWithProviders(<TaskListPage />)

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "New Task" })).toHaveAttribute("href", "/tasks/new")
    )
  })
})

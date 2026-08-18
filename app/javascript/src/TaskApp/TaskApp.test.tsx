import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { TaskApp } from "./TaskApp"

describe("TaskApp", () => {
  it("renders the task list at /", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TaskApp />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument())
  })

  it("renders the create form at /tasks/new", async () => {
    render(
      <MemoryRouter initialEntries={["/tasks/new"]}>
        <TaskApp />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByRole("heading", { name: "New task" })).toBeInTheDocument())
  })

  it("redirects unknown paths to /", async () => {
    render(
      <MemoryRouter initialEntries={["/nonexistent"]}>
        <TaskApp />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument())
  })

  it("seeds the task list from initialTasks props without waiting on a fetch", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TaskApp
          initialTasks={[
            {
              id: 1,
              title: "Seeded via props",
              description: "",
              done: false,
              is_public: false,
              owner_username: "testuser",
              created_at: "",
              updated_at: "",
            },
          ]}
        />
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText("Seeded via props")).toBeInTheDocument())
  })
})

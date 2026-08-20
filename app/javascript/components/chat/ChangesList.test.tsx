import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "@/test/render"
import type { TaskChange } from "@/api/chat"
import { ChangesList } from "./ChangesList"

describe("ChangesList", () => {
  it("shows an empty state when there are no changes", () => {
    renderWithProviders(<ChangesList changes={[]} />)

    expect(screen.getByText("No changes yet.")).toBeInTheDocument()
  })

  it("renders a change's action label and links its title to the task's edit page", () => {
    const changes: TaskChange[] = [{ action: "created", id: 5, title: "Buy milk" }]
    renderWithProviders(<ChangesList changes={changes} />)

    expect(screen.getByText("Created")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Buy milk" })).toHaveAttribute("href", "/tasks/5/edit")
  })

  it("does not link a deleted item, since the task no longer exists", () => {
    const changes: TaskChange[] = [{ action: "deleted", id: 9, title: "Old task" }]
    renderWithProviders(<ChangesList changes={changes} />)

    expect(screen.getByText("Old task")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Old task" })).not.toBeInTheDocument()
  })

  it("renders the most recently arrived change first", () => {
    const changes: TaskChange[] = [
      { action: "created", id: 1, title: "First" },
      { action: "updated", id: 2, title: "Second" },
    ]
    renderWithProviders(<ChangesList changes={changes} />)

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["Second", "First"])
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import { renderWithProviders } from "@/test/render"
import { AccountPage } from "./AccountPage"

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe("AccountPage", () => {
  it("shows the current user's email and username", async () => {
    renderWithProviders(<AccountPage />)

    expect(await screen.findByText("testuser@example.com")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText("Username")).toHaveValue("testuser"))
  })

  it("has no visible token until one is generated", async () => {
    renderWithProviders(<AccountPage />)

    await waitFor(() => expect(screen.getByLabelText("Username")).toHaveValue("testuser"))
    expect(screen.getByText(/regenerate to get one/i)).toBeInTheDocument()
  })

  it("reveals and copies a token after regenerating", async () => {
    renderWithProviders(<AccountPage />)
    await waitFor(() => expect(screen.getByLabelText("Username")).toHaveValue("testuser"))

    fireEvent.click(screen.getByRole("button", { name: "Regenerate token" }))

    await waitFor(() => expect(screen.getByLabelText("API token")).toHaveValue("regenerated-token"))

    fireEvent.click(screen.getByRole("button", { name: "Copy" }))

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("regenerated-token"))
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
  })

  it("updates the username", async () => {
    renderWithProviders(<AccountPage />)
    await waitFor(() => expect(screen.getByLabelText("Username")).toHaveValue("testuser"))

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "renamed" } })
    fireEvent.click(screen.getByRole("button", { name: "Save username" }))

    await waitFor(() => expect(screen.getByLabelText("Username")).toHaveValue("renamed"))
  })
})

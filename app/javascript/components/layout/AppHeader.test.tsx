import { describe, it, expect } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { AppHeader } from "./AppHeader"

describe("AppHeader", () => {
  it("shows the username and a logout control when authenticated", async () => {
    renderWithProviders(<AppHeader />)

    await waitFor(() => expect(screen.getByRole("link", { name: "testuser" })).toHaveAttribute("href", "/account"))
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument()
  })

  it("shows login/register links when unauthenticated", async () => {
    server.use(
      http.get("/api/account", () =>
        HttpResponse.json({ meta: { success: false, error: "Unauthenticated" } }, { status: 401 })
      )
    )
    renderWithProviders(<AppHeader />)

    await waitFor(() => expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login"))
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register")
  })

  it("clears the user when logout is clicked", async () => {
    renderWithProviders(<AppHeader />)
    await waitFor(() => expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Log out" }))

    await waitFor(() => expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument())
  })
})

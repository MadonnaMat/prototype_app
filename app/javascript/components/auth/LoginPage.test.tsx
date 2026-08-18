import { describe, it, expect } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import { Routes, Route } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { LoginPage } from "./LoginPage"

function renderPage(route = "/login") {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Task list page</p>} />
    </Routes>,
    { route }
  )
}

describe("LoginPage", () => {
  it("renders email and password fields", () => {
    renderPage()

    expect(screen.getByLabelText("Email")).toHaveValue("")
    expect(screen.getByLabelText("Password")).toHaveValue("")
  })

  it("navigates to / after a successful login", async () => {
    renderPage()

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "one@example.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } })
    fireEvent.click(screen.getByRole("button", { name: "Log in" }))

    await waitFor(() => expect(screen.getByText("Task list page")).toBeInTheDocument())
  })

  it("shows an error message on invalid credentials", async () => {
    server.use(
      http.post("/api/session", () =>
        HttpResponse.json({ meta: { success: false, error: "Invalid email or password" } }, { status: 401 })
      )
    )
    renderPage()

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "one@example.com" } })
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } })
    fireEvent.click(screen.getByRole("button", { name: "Log in" }))

    await waitFor(() => expect(screen.getByText("Invalid email or password")).toBeInTheDocument())
  })

  it("links to the register page", () => {
    renderPage()

    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register")
  })
})

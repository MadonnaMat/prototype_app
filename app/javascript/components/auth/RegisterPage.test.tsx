import { describe, it, expect } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import { Routes, Route } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { RegisterPage } from "./RegisterPage"

function renderPage(route = "/register") {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<p>Task list page</p>} />
    </Routes>,
    { route }
  )
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "newuser" } })
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } })
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password" } })
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password" } })
  fireEvent.click(screen.getByRole("button", { name: "Register" }))
}

describe("RegisterPage", () => {
  it("renders the registration fields", () => {
    renderPage()

    expect(screen.getByLabelText("Username")).toHaveValue("")
    expect(screen.getByLabelText("Email")).toHaveValue("")
  })

  it("navigates to / after a successful registration", async () => {
    renderPage()

    fillAndSubmit()

    await waitFor(() => expect(screen.getByText("Task list page")).toBeInTheDocument())
  })

  it("shows a field error on a taken username", async () => {
    server.use(
      http.post("/api/registration", () =>
        HttpResponse.json(
          { meta: { success: false, errors: { username: ["has already been taken"] } } },
          { status: 422 }
        )
      )
    )
    renderPage()

    fillAndSubmit()

    await waitFor(() => expect(screen.getByText("has already been taken")).toBeInTheDocument())
  })

  it("links to the login page", () => {
    renderPage()

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login")
  })
})

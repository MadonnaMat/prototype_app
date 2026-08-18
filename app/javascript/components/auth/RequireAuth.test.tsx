import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { Routes, Route } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { RequireAuth } from "./RequireAuth"

function renderProtected(route = "/protected") {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route element={<RequireAuth />}>
        <Route path="/protected" element={<p>Protected content</p>} />
      </Route>
    </Routes>,
    { route }
  )
}

describe("RequireAuth", () => {
  it("shows a loading state before the auth check resolves", () => {
    renderProtected()

    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("renders the protected route once authenticated", async () => {
    renderProtected()

    await waitFor(() => expect(screen.getByText("Protected content")).toBeInTheDocument())
  })

  it("redirects to /login when not authenticated", async () => {
    server.use(
      http.get("/api/account", () =>
        HttpResponse.json({ meta: { success: false, error: "Unauthenticated" } }, { status: 401 })
      )
    )

    renderProtected()

    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument())
  })
})

import type { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { createQueryClient } from "@/lib/query-client"
import { buildTask } from "@/test/msw/handlers"
import { SsrDataContext, type SsrData } from "@/src/TaskApp/routes/ssr-data-context"
import { AuthProvider } from "@/contexts/AuthContext"
import { useTaskFormController } from "./useTaskFormController"

const mockNavigate = vi.fn()
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockToastSuccess = vi.fn()
vi.mock("sonner", () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }))

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function wrapperWithSsr(ssrData: SsrData) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={createQueryClient()}>
        <AuthProvider>
          <MemoryRouter>
            <SsrDataContext.Provider value={ssrData}>{children}</SsrDataContext.Provider>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    )
  }
}

describe("useTaskFormController", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockToastSuccess.mockClear()
  })

  describe("create mode (no id)", () => {
    it("is ready immediately with no initial values", () => {
      const { result } = renderHook(() => useTaskFormController(undefined), { wrapper })

      expect(result.current.isReady).toBe(true)
      expect(result.current.initialValues).toBeUndefined()
      expect(result.current.notFound).toBe(false)
    })

    it("creates the task, toasts, and navigates home on submit", async () => {
      const { result } = renderHook(() => useTaskFormController(undefined), { wrapper })

      act(() => result.current.onSubmit({ title: "New task" }))

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"))
      expect(mockToastSuccess).toHaveBeenCalledWith("Task created")
    })
  })

  describe("edit mode (with id)", () => {
    it("is not ready until the task loads, then exposes initialValues", async () => {
      const { result } = renderHook(() => useTaskFormController("5"), { wrapper })

      expect(result.current.isReady).toBe(false)

      await waitFor(() => expect(result.current.isReady).toBe(true))
      expect(result.current.initialValues?.id).toBe(5)
    })

    it("updates the task, toasts, and navigates home on submit", async () => {
      const { result } = renderHook(() => useTaskFormController("5"), { wrapper })
      await waitFor(() => expect(result.current.isReady).toBe(true))

      act(() => result.current.onSubmit({ title: "Updated" }))

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"))
      expect(mockToastSuccess).toHaveBeenCalledWith("Task updated")
    })

    it("reports notFound when the task fetch fails with a 404", async () => {
      server.use(
        http.get("/api/tasks/:id", () =>
          HttpResponse.json({ meta: { success: false, error: "Not found" } }, { status: 404 })
        )
      )
      const { result } = renderHook(() => useTaskFormController("999"), { wrapper })

      await waitFor(() => expect(result.current.notFound).toBe(true))
      expect(result.current.loadError).toBe(false)
    })

    it("reports loadError (not notFound) when the task fetch fails with a server error", async () => {
      server.use(
        http.get("/api/tasks/:id", () =>
          HttpResponse.json({ meta: { success: false, error: "Internal error" } }, { status: 500 })
        )
      )
      const { result } = renderHook(() => useTaskFormController("5"), { wrapper })

      await waitFor(() => expect(result.current.loadError).toBe(true))
      expect(result.current.notFound).toBe(false)
    })

    it("reports isForbidden for a visible task owned by someone else", async () => {
      server.use(
        http.get("/api/tasks/:id", ({ params }) =>
          HttpResponse.json({
            task: buildTask({ id: Number(params.id), owner_username: "someone-else" }),
            meta: { success: true },
          })
        )
      )
      const { result } = renderHook(() => useTaskFormController("5"), { wrapper })

      await waitFor(() => expect(result.current.isForbidden).toBe(true))
    })

    it("uses SSR initialTask as initialData when its id matches the route id", () => {
      const initialTask = buildTask({ id: 5, title: "Seeded via SSR" })
      const { result } = renderHook(() => useTaskFormController("5"), {
        wrapper: wrapperWithSsr({ initialTask }),
      })

      expect(result.current.isReady).toBe(true)
      expect(result.current.initialValues?.title).toBe("Seeded via SSR")
    })

    it("ignores SSR initialTask when its id doesn't match the route id", () => {
      const initialTask = buildTask({ id: 7, title: "Wrong task" })
      const { result } = renderHook(() => useTaskFormController("5"), {
        wrapper: wrapperWithSsr({ initialTask }),
      })

      expect(result.current.isReady).toBe(false)
      expect(result.current.initialValues).toBeUndefined()
    })
  })
})

import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { createQueryClient } from "@/lib/query-client"
import { createQueryWrapper } from "@/test/render"
import type { Task } from "@/api/tasks"
import { taskKeys } from "./useTaskQueries"
import { useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from "./useTaskMutations"

const seedTask: Task = {
  id: 1,
  title: "Old title",
  description: "",
  done: false,
  created_at: "",
  updated_at: "",
}

describe("useCreateTaskMutation", () => {
  it("invalidates the list query on success", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useCreateTaskMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate({ title: "New task" }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.lists() })
  })
})

describe("useUpdateTaskMutation", () => {
  it("optimistically updates the cached list before the server responds", async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<Task[]>(taskKeys.lists(), [seedTask])
    const { result } = renderHook(() => useUpdateTaskMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate({ id: 1, data: { title: "New title" } }))

    await waitFor(() => {
      expect(queryClient.getQueryData<Task[]>(taskKeys.lists())?.[0].title).toBe("New title")
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("optimistically updates the cached list when id is a string (e.g. from route params)", async () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData<Task[]>(taskKeys.lists(), [seedTask])
    const { result } = renderHook(() => useUpdateTaskMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate({ id: "1", data: { title: "New title" } }))

    await waitFor(() => {
      expect(queryClient.getQueryData<Task[]>(taskKeys.lists())?.[0].title).toBe("New title")
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("rolls back the optimistic update when the request fails", async () => {
    server.use(
      http.patch("/api/tasks/:id", () =>
        HttpResponse.json({ meta: { success: false, errors: { title: ["can't be blank"] } } }, { status: 422 })
      )
    )
    const queryClient = createQueryClient()
    queryClient.setQueryData<Task[]>(taskKeys.lists(), [seedTask])
    const { result } = renderHook(() => useUpdateTaskMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate({ id: 1, data: { title: "" } }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData<Task[]>(taskKeys.lists())?.[0].title).toBe("Old title")
  })
})

describe("useDeleteTaskMutation", () => {
  it("invalidates the list query on success", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useDeleteTaskMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate(1))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: taskKeys.lists() })
  })
})

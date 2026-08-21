import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { createQueryClient } from "@/lib/query-client"
import { createQueryWrapper } from "@/test/render"
import { conversationKeys } from "./useConversationQueries"
import { useRenameConversationMutation, useDeleteConversationMutation } from "./useConversationMutations"

describe("useRenameConversationMutation", () => {
  it("invalidates the list and detail queries on settle", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useRenameConversationMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate({ id: 1, title: "New title" }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.detail(1) })
  })

  it("still invalidates on a failed rename", async () => {
    server.use(
      http.patch("/api/conversations/:id", () =>
        HttpResponse.json({ meta: { success: false, errors: { title: ["can't be blank"] } } }, { status: 422 })
      )
    )
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useRenameConversationMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate({ id: 1, title: "" }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() })
  })
})

describe("useDeleteConversationMutation", () => {
  it("invalidates the list query on success", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useDeleteConversationMutation(), { wrapper: createQueryWrapper(queryClient) })

    act(() => result.current.mutate(1))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: conversationKeys.lists() })
  })
})

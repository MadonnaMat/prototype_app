import { describe, it, expect } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { createQueryWrapper } from "@/test/render"
import { buildConversationDetail } from "@/test/msw/handlers"
import { conversationKeys, useConversationsQuery, useConversationQuery } from "./useConversationQueries"

describe("useConversationsQuery", () => {
  it("fetches the conversation list", async () => {
    const { result } = renderHook(() => useConversationsQuery(), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
  })

  it("seeds from initialData without waiting on a fetch", () => {
    const { result } = renderHook(
      () => useConversationsQuery([{ id: 9, title: "Seeded", title_generated: true, updated_at: "" }]),
      { wrapper: createQueryWrapper() }
    )

    expect(result.current.data?.[0].title).toBe("Seeded")
  })
})

describe("useConversationQuery", () => {
  it("fetches a single conversation by id", async () => {
    const { result } = renderHook(() => useConversationQuery("7"), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe(7)
  })

  it("does not fetch when id is undefined", () => {
    const { result } = renderHook(() => useConversationQuery(undefined), { wrapper: createQueryWrapper() })

    expect(result.current.fetchStatus).toBe("idle")
  })

  it("seeds from initialData without waiting on a fetch", () => {
    const { result } = renderHook(() => useConversationQuery("9", buildConversationDetail({ id: 9, title: "Seeded" })), {
      wrapper: createQueryWrapper(),
    })

    expect(result.current.data?.title).toBe("Seeded")
  })
})

describe("conversationKeys", () => {
  it("builds distinct list/detail keys", () => {
    expect(conversationKeys.lists()).toEqual(["conversations", "list"])
    expect(conversationKeys.detail(3)).toEqual(["conversations", "detail", "3"])
  })

  it("builds the same detail key regardless of id type", () => {
    expect(conversationKeys.detail(3)).toEqual(conversationKeys.detail("3"))
  })
})

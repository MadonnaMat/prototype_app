import type { ReactNode } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { HttpResponse, http } from "msw"
import { streamOf, mockFetchResolving, controlledStream } from "@/test/sse"
import { server } from "@/test/msw/server"
import { buildConversation, buildConversationDetail } from "@/test/msw/handlers"
import type { Conversation } from "@/api/conversations"
import { useChatStream } from "./useChatStream"
import { conversationKeys } from "./useConversationQueries"

const mockToastError = vi.fn()
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }))

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
  return { Wrapper, queryClient }
}

const doneChunk = (id: number, title: string, conversationId = 1) =>
  `data: {"choices":[{"delta":{},"finish_reason":"stop"}],"task_changes":[{"action":"created","id":${id},"title":"${title}"}],"conversation_id":${conversationId}}\n\n`

describe("useChatStream", () => {
  beforeEach(() => {
    mockToastError.mockClear()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends a message and accumulates the reply and task changes", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf([
          'data: {"choices":[{"delta":{"content":"Sure, "}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"done."}}]}\n\n',
          doneChunk(42, "Test task"),
          "data: [DONE]\n\n",
        ])
      )
    )

    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.sendMessage("create a task"))

    expect(result.current.messages).toEqual([{ id: expect.any(String), role: "user", content: "create a task" }])
    expect(result.current.isSending).toBe(true)

    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(result.current.messages).toEqual([
      { id: expect.any(String), role: "user", content: "create a task" },
      { id: expect.any(String), role: "assistant", content: "Sure, done." },
    ])
    expect(result.current.streamingMessage).toBeNull()
    expect(result.current.changes).toEqual([{ action: "created", id: 42, title: "Test task" }])
    expect(result.current.error).toBeNull()
  })

  it("sends only the new message and conversation id, not the full history", async () => {
    const fetchMock = mockFetchResolving(streamOf([doneChunk(1, "First"), "data: [DONE]\n\n"]))
    vi.stubGlobal("fetch", fetchMock)

    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })
    act(() => result.current.sendMessage("first"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(options.body as string)).toEqual({ conversation_id: null, message: { content: "first" } })
  })

  it("navigates to the new conversation id once a brand-new chat's first turn completes", async () => {
    vi.stubGlobal("fetch", mockFetchResolving(streamOf([doneChunk(1, "First", 7), "data: [DONE]\n\n"])))

    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })
    act(() => result.current.sendMessage("hi"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(mockNavigate).toHaveBeenCalledWith("/assistant/7", { replace: true })
  })

  it("does not navigate on a follow-up to an existing conversation", async () => {
    // Hydration must resolve via the real (MSW-backed) fetch BEFORE fetch is
    // stubbed for the chat POST below — stubbing global.fetch first would
    // also intercept the conversation GET and break hydration.
    const { result } = renderHook(() => useChatStream("7"), { wrapper: createWrapper().Wrapper })
    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false))

    vi.stubGlobal("fetch", mockFetchResolving(streamOf([doneChunk(1, "First", 7), "data: [DONE]\n\n"])))
    act(() => result.current.sendMessage("follow up"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("invalidates the conversations list query when a brand-new conversation's first turn completes", async () => {
    vi.stubGlobal("fetch", mockFetchResolving(streamOf([doneChunk(1, "First"), "data: [DONE]\n\n"])))
    const { Wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useChatStream(), { wrapper: Wrapper })
    act(() => result.current.sendMessage("hi"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["conversations", "list"] })
  })

  it("patches the cached conversations list in place (no refetch) when a follow-up on an existing conversation completes", async () => {
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(conversationKeys.lists(), [buildConversation({ id: 7, updated_at: "2020-01-01T00:00:00.000Z" })])

    // Hydration must resolve via the real (MSW-backed) fetch BEFORE fetch is
    // stubbed for the chat POST below — same reasoning as the "does not
    // navigate on a follow-up" test above.
    const { result } = renderHook(() => useChatStream("7"), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false))

    vi.stubGlobal("fetch", mockFetchResolving(streamOf([doneChunk(1, "First", 7), "data: [DONE]\n\n"])))
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    act(() => result.current.sendMessage("follow up"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: conversationKeys.lists() })
    const [cached] = queryClient.getQueryData(conversationKeys.lists()) as Conversation[]
    expect(cached.updated_at).not.toBe("2020-01-01T00:00:00.000Z")
  })

  it("surfaces usage and a compaction notice from the done event", async () => {
    const chunk =
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"task_changes":[],"conversation_id":1,"compacted":true,"usage":{"prompt_tokens":3300,"completion_tokens":50,"context_window":4096}}\n\n'
    vi.stubGlobal("fetch", mockFetchResolving(streamOf([chunk, "data: [DONE]\n\n"])))

    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })
    act(() => result.current.sendMessage("hi"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(result.current.usage).toEqual({ promptTokens: 3300, completionTokens: 50, contextWindow: 4096 })
    expect(result.current.hasCompactionNotice).toBe(true)
  })

  it("reports isCompacting while waiting on a :compacting chunk, clearing it once real content streams in", async () => {
    const { stream, push, close } = controlledStream()
    vi.stubGlobal("fetch", mockFetchResolving(stream))
    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.sendMessage("hi"))
    await act(async () => push('data: {"compacting":true}\n\n'))
    await waitFor(() => expect(result.current.isCompacting).toBe(true))

    await act(async () => push('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n'))
    await waitFor(() => expect(result.current.streamingMessage?.content).toBe("Hi"))
    expect(result.current.isCompacting).toBe(false)

    await act(async () => {
      push(doneChunk(1, "Task"))
      push("data: [DONE]\n\n")
      close()
    })
    await waitFor(() => expect(result.current.isSending).toBe(false))
    expect(result.current.isCompacting).toBe(false)
  })

  it("accumulates changes across separate sends rather than overwriting them", async () => {
    vi.stubGlobal("fetch", mockFetchResolving(streamOf([doneChunk(1, "First"), "data: [DONE]\n\n"])))
    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.sendMessage("first"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    vi.stubGlobal("fetch", mockFetchResolving(streamOf([doneChunk(2, "Second"), "data: [DONE]\n\n"])))
    act(() => result.current.sendMessage("second"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(result.current.changes).toEqual([
      { action: "created", id: 1, title: "First" },
      { action: "created", id: 2, title: "Second" },
    ])
  })

  it("sets an error and toasts when the request fails outright", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network failure")))
    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.sendMessage("hi"))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.isSending).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith(result.current.error)
  })

  it("recovers from a server error frame that ends the stream with no DONE payload, so the next send isn't blocked", async () => {
    // Mirrors what ChatController's top-level rescue actually sends on an
    // unhandled exception mid-turn: one :error frame, then the raw [DONE]
    // sentinel — never a real :done-shaped chunk.
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(streamOf([ 'data: {"error":{"message":"Validation failed: Content can\'t be blank"}}\n\n', "data: [DONE]\n\n" ]))
    )
    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.sendMessage("hi"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(result.current.error).toBe("Validation failed: Content can't be blank")

    // The critical assertion: a subsequent send must actually go out, not
    // silently no-op because status was still stuck at "sending".
    vi.stubGlobal("fetch", mockFetchResolving(streamOf([ doneChunk(1, "Task"), "data: [DONE]\n\n" ])))
    act(() => result.current.sendMessage("try again"))

    expect(result.current.isSending).toBe(true)
    await waitFor(() => expect(result.current.isSending).toBe(false))
  })

  it("ignores empty or whitespace-only messages", () => {
    vi.stubGlobal("fetch", vi.fn())
    const { result } = renderHook(() => useChatStream(), { wrapper: createWrapper().Wrapper })

    act(() => result.current.sendMessage("   "))

    expect(result.current.messages).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("hydrates messages, changes, and usage from a loaded conversation", async () => {
    server.use(
      http.get("/api/conversations/:id", () =>
        HttpResponse.json({
          conversation: buildConversationDetail({
            id: 7,
            last_prompt_tokens: 500,
            context_window: 4096,
            messages: [
              { id: 1, role: "user", content: "hi", task_changes: [], created_at: "2026-01-01T00:00:00.000Z" },
              {
                id: 2,
                role: "assistant",
                content: "hello",
                task_changes: [{ action: "created", id: 9, title: "Task" }],
                created_at: "2026-01-01T00:00:01.000Z",
              },
            ],
          }),
          meta: { success: true },
        })
      )
    )

    const { result } = renderHook(() => useChatStream("7"), { wrapper: createWrapper().Wrapper })

    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false))

    expect(result.current.messages).toEqual([
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "hello" },
    ])
    expect(result.current.changes).toEqual([{ action: "created", id: 9, title: "Task" }])
    expect(result.current.usage).toEqual({ promptTokens: 500, completionTokens: 0, contextWindow: 4096 })
  })

  it("reports notFound and stops isLoadingHistory when the conversation fetch fails (unowned or deleted)", async () => {
    server.use(
      http.get("/api/conversations/:id", () =>
        HttpResponse.json({ meta: { success: false, error: "Conversation not found" } }, { status: 404 })
      )
    )

    const { result } = renderHook(() => useChatStream("999"), { wrapper: createWrapper().Wrapper })

    await waitFor(() => expect(result.current.notFound).toBe(true))
    expect(result.current.isLoadingHistory).toBe(false)
  })
})

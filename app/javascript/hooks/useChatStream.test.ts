import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { streamOf, mockFetchResolving } from "@/test/sse"
import { useChatStream } from "./useChatStream"

const mockToastError = vi.fn()
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }))

// Simulates a real fetch()'s AbortSignal integration: the stream stays open (as if
// waiting on the network) until the signal fires, then its pending read rejects —
// exactly what needs to happen for the hook's clear()-mid-stream path to be exercised.
function mockFetchPendingUntilAborted() {
  return vi.fn((_url: string, options: RequestInit) => {
    const signal = options.signal as AbortSignal
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        signal.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")))
      },
    })
    return Promise.resolve(new Response(body, { status: 200 }))
  })
}

const doneChunk = (id: number, title: string) =>
  `data: {"choices":[{"delta":{},"finish_reason":"stop"}],"task_changes":[{"action":"created","id":${id},"title":"${title}"}]}\n\n`

describe("useChatStream", () => {
  beforeEach(() => {
    mockToastError.mockClear()
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

    const { result } = renderHook(() => useChatStream())

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

  it("accumulates changes across separate sends rather than overwriting them", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(streamOf([doneChunk(1, "First"), "data: [DONE]\n\n"]))
    )
    const { result } = renderHook(() => useChatStream())

    act(() => result.current.sendMessage("first"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    vi.stubGlobal(
      "fetch",
      mockFetchResolving(streamOf([doneChunk(2, "Second"), "data: [DONE]\n\n"]))
    )
    act(() => result.current.sendMessage("second"))
    await waitFor(() => expect(result.current.isSending).toBe(false))

    expect(result.current.changes).toEqual([
      { action: "created", id: 1, title: "First" },
      { action: "created", id: 2, title: "Second" },
    ])
  })

  it("aborts the in-flight request and resets state on clear(), without an error toast", async () => {
    vi.stubGlobal("fetch", mockFetchPendingUntilAborted())
    const { result } = renderHook(() => useChatStream())

    act(() => result.current.sendMessage("hi"))
    await waitFor(() => expect(result.current.isSending).toBe(true))

    act(() => result.current.clear())

    await waitFor(() => expect(result.current.messages).toEqual([]))
    expect(result.current.streamingMessage).toBeNull()
    expect(result.current.changes).toEqual([])
    expect(result.current.isSending).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it("sets an error and toasts when the request fails outright", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network failure")))
    const { result } = renderHook(() => useChatStream())

    act(() => result.current.sendMessage("hi"))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.isSending).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith(result.current.error)
  })

  it("ignores empty or whitespace-only messages", () => {
    vi.stubGlobal("fetch", vi.fn())
    const { result } = renderHook(() => useChatStream())

    act(() => result.current.sendMessage("   "))

    expect(result.current.messages).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})

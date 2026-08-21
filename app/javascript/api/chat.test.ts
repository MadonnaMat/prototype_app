import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { streamOfBytes, streamOf, mockFetchResolving } from "@/test/sse"
import { postChatCompletion, ChatRequestError, type ChatStreamEvent } from "./chat"

async function collect(events: AsyncGenerator<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const collected: ChatStreamEvent[] = []
  for await (const event of events) collected.push(event)
  return collected
}

function send(content = "hi", conversationId: number | null = null) {
  return postChatCompletion({ conversationId, content }, new AbortController().signal)
}

describe("postChatCompletion", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="csrf-token" content="test-csrf-token">'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("yields content deltas from multiple frames delivered in a single read", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf([
          'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"}}]}\n\ndata: [DONE]\n\n',
        ])
      )
    )

    const events = await collect(send())

    expect(events).toEqual([
      { type: "content_delta", text: "Hi" },
      { type: "content_delta", text: " there" },
    ])
  })

  it("reassembles a frame split across two reads", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf(['data: {"choices":[{"delta":{"content":"Hi"}}', "]}\n\ndata: [DONE]\n\n"])
      )
    )

    const events = await collect(send())

    expect(events).toEqual([{ type: "content_delta", text: "Hi" }])
  })

  it("yields a compacting event ahead of the real reply", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf([
          'data: {"compacting":true}\n\n',
          'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
          "data: [DONE]\n\n",
        ])
      )
    )

    const events = await collect(send())

    expect(events).toEqual([{ type: "compacting" }, { type: "content_delta", text: "Hi" }])
  })

  it("yields a done event with task_changes, conversation_id, compacted, and usage", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf([
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"task_changes":[{"action":"created","id":42,"title":"Test"}],"conversation_id":7,"compacted":true,"usage":{"prompt_tokens":100,"completion_tokens":20,"context_window":4096}}\n\n',
          "data: [DONE]\n\n",
        ])
      )
    )

    const events = await collect(send())

    expect(events).toEqual([
      { type: "content_delta", text: "ok" },
      {
        type: "done",
        finishReason: "stop",
        taskChanges: [{ action: "created", id: 42, title: "Test" }],
        conversationId: 7,
        compacted: true,
        usage: { promptTokens: 100, completionTokens: 20, contextWindow: 4096 },
      },
    ])
  })

  it("defaults compacted to false and usage to null when the server omits them", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf([
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"task_changes":[],"conversation_id":7}\n\n',
          "data: [DONE]\n\n",
        ])
      )
    )

    const events = await collect(send())

    expect(events).toEqual([
      { type: "done", finishReason: "stop", taskChanges: [], conversationId: 7, compacted: false, usage: null },
    ])
  })

  it("keeps reading after a mid-stream error frame instead of stopping early", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf([
          'data: {"error":{"message":"boom"}}\n\n',
          'data: {"choices":[{"delta":{"content":"after"}}]}\n\n',
          "data: [DONE]\n\n",
        ])
      )
    )

    const events = await collect(send())

    expect(events).toEqual([
      { type: "error", message: "boom" },
      { type: "content_delta", text: "after" },
    ])
  })

  it("decodes a multi-byte UTF-8 character split across a chunk boundary", async () => {
    const full = 'data: {"choices":[{"delta":{"content":"café"}}]}\n\ndata: [DONE]\n\n'
    const prefixLength = new TextEncoder().encode(
      'data: {"choices":[{"delta":{"content":"caf'
    ).length
    const bytes = new TextEncoder().encode(full)
    // "é" is a 2-byte UTF-8 sequence — split one byte into it so neither chunk is valid UTF-8 alone.
    const splitAt = prefixLength + 1

    vi.stubGlobal("fetch", mockFetchResolving(streamOfBytes([bytes.slice(0, splitAt), bytes.slice(splitAt)])))

    const events = await collect(send())

    expect(events).toEqual([{ type: "content_delta", text: "café" }])
  })

  it("rejects with a status-aware ChatRequestError before reading the body on a non-2xx response", async () => {
    vi.stubGlobal("fetch", mockFetchResolving(null, 401))

    await expect(collect(send())).rejects.toThrow(ChatRequestError)
    await expect(collect(send())).rejects.toThrow("Session expired — please log in again.")
  })

  it("sends conversation_id and message.content in the request body, with the CSRF token header", async () => {
    const fetchMock = mockFetchResolving(streamOf(["data: [DONE]\n\n"]))
    vi.stubGlobal("fetch", fetchMock)

    await collect(send("hi", 7))

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(options.body as string)).toEqual({ conversation_id: 7, message: { content: "hi" } })
    expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe("test-csrf-token")
  })

  it("sends a null conversation_id for a brand-new chat", async () => {
    const fetchMock = mockFetchResolving(streamOf(["data: [DONE]\n\n"]))
    vi.stubGlobal("fetch", fetchMock)

    await collect(send("hi", null))

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(options.body as string)).toEqual({ conversation_id: null, message: { content: "hi" } })
  })
})

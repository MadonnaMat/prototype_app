import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { postChatCompletion, ChatRequestError, type ChatStreamEvent } from "./chat"

function streamOfBytes(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index])
        index++
      } else {
        controller.close()
      }
    },
  })
}

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return streamOfBytes(chunks.map((chunk) => encoder.encode(chunk)))
}

function mockFetchResolving(body: ReadableStream<Uint8Array> | null, status = 200) {
  return vi.fn().mockResolvedValue(new Response(body, { status }))
}

async function collect(events: AsyncGenerator<ChatStreamEvent>): Promise<ChatStreamEvent[]> {
  const collected: ChatStreamEvent[] = []
  for await (const event of events) collected.push(event)
  return collected
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

    const events = await collect(postChatCompletion([], new AbortController().signal))

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

    const events = await collect(postChatCompletion([], new AbortController().signal))

    expect(events).toEqual([{ type: "content_delta", text: "Hi" }])
  })

  it("yields a done event with task_changes and stops after [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchResolving(
        streamOf([
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"task_changes":[{"action":"created","id":42,"title":"Test"}]}\n\n',
          "data: [DONE]\n\n",
        ])
      )
    )

    const events = await collect(postChatCompletion([], new AbortController().signal))

    expect(events).toEqual([
      { type: "content_delta", text: "ok" },
      { type: "done", finishReason: "stop", taskChanges: [{ action: "created", id: 42, title: "Test" }] },
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

    const events = await collect(postChatCompletion([], new AbortController().signal))

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

    const events = await collect(postChatCompletion([], new AbortController().signal))

    expect(events).toEqual([{ type: "content_delta", text: "café" }])
  })

  it("rejects with a status-aware ChatRequestError before reading the body on a non-2xx response", async () => {
    vi.stubGlobal("fetch", mockFetchResolving(null, 401))

    await expect(collect(postChatCompletion([], new AbortController().signal))).rejects.toThrow(ChatRequestError)
    await expect(collect(postChatCompletion([], new AbortController().signal))).rejects.toThrow(
      "Session expired — please log in again."
    )
  })

  it("sends the CSRF token header on the outgoing request", async () => {
    const fetchMock = mockFetchResolving(streamOf(["data: [DONE]\n\n"]))
    vi.stubGlobal("fetch", fetchMock)

    await collect(postChatCompletion([{ role: "user", content: "hi" }], new AbortController().signal))

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((options.headers as Record<string, string>)["X-CSRF-Token"]).toBe("test-csrf-token")
  })
})

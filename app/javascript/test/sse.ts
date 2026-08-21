import { vi } from "vitest"

// Test double for a streamed fetch() response body: enqueues each given chunk on its
// own pull(), so callers can control exactly how bytes are split across `reader.read()`
// calls (e.g. to simulate a frame or a multi-byte character split across two reads).
export function streamOfBytes(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
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

export function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return streamOfBytes(chunks.map((chunk) => encoder.encode(chunk)))
}

export function mockFetchResolving(body: ReadableStream<Uint8Array> | null, status = 200) {
  return vi.fn().mockResolvedValue(new Response(body, { status }))
}

// Unlike streamOf/streamOfBytes (which enqueue every chunk back-to-back with
// no real gap, so a consumer's intermediate state between two chunks is
// never actually observable by a polling assertion like waitFor), this
// hands the caller manual control over when each chunk arrives — needed to
// assert on a state that a stream is expected to pass through only briefly
// (e.g. "compacting" before real content starts).
export function controlledStream() {
  let controllerRef: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller
    },
  })
  const encoder = new TextEncoder()
  return {
    stream,
    push: (chunk: string) => controllerRef.enqueue(encoder.encode(chunk)),
    close: () => controllerRef.close(),
  }
}

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

import { csrfToken } from "./client"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface TaskChange {
  action: "created" | "updated" | "completed" | "deleted"
  id: number
  title: string
}

export type ChatStreamEvent =
  | { type: "content_delta"; text: string }
  | { type: "done"; finishReason: string | null; taskChanges: TaskChange[] }
  | { type: "error"; message: string }

export class ChatRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ChatRequestError"
    this.status = status
  }
}

interface RawChunk {
  choices?: [{ delta: { content?: string }; finish_reason?: string | null }]
  task_changes?: TaskChange[]
  error?: { message: string }
}

function statusMessage(status: number): string {
  if (status === 401) return "Session expired — please log in again."
  return "Something went wrong — please try again."
}

// SSE frames aren't guaranteed to align with individual `reader.read()` calls, so
// incoming text is buffered and split on the blank-line frame separator as it arrives;
// any trailing partial frame is carried over to the next read.
function extractFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = []
  let rest = buffer
  let separatorIndex = rest.indexOf("\n\n")
  while (separatorIndex !== -1) {
    frames.push(rest.slice(0, separatorIndex))
    rest = rest.slice(separatorIndex + 2)
    separatorIndex = rest.indexOf("\n\n")
  }
  return { frames, rest }
}

function extractDataLine(frame: string): string | null {
  const line = frame.split("\n").find((entry) => entry.startsWith("data: "))
  return line ? line.slice("data: ".length) : null
}

function toEvent(payload: RawChunk): ChatStreamEvent | null {
  if (payload.error) return { type: "error", message: payload.error.message }

  const choice = payload.choices?.[0]
  if (!choice) return null

  if ("finish_reason" in choice) {
    return { type: "done", finishReason: choice.finish_reason ?? null, taskChanges: payload.task_changes ?? [] }
  }
  if (choice.delta.content) {
    return { type: "content_delta", text: choice.delta.content }
  }
  return null
}

// The terminal `data: [DONE]` frame is a literal string sentinel, not JSON — it must be
// checked for before attempting to JSON.parse the frame's data line.
function parseFrame(frame: string): ChatStreamEvent | "done" | null {
  const data = extractDataLine(frame)
  if (data === null) return null
  if (data === "[DONE]") return "done"
  return toEvent(JSON.parse(data) as RawChunk)
}

async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return

      // { stream: true } retains any trailing partial multi-byte UTF-8 sequence for the next decode call.
      buffer += decoder.decode(value, { stream: true })
      const { frames, rest } = extractFrames(buffer)
      buffer = rest

      for (const frame of frames) {
        const event = parseFrame(frame)
        if (event === "done") return
        if (event) yield event
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* postChatCompletion(
  messages: ChatMessage[],
  signal: AbortSignal
): AsyncGenerator<ChatStreamEvent> {
  let response: Response
  try {
    response = await fetch("/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken() ? { "X-CSRF-Token": csrfToken()! } : {}),
      },
      body: JSON.stringify({ messages: messages.map(({ role, content }) => ({ role, content })) }),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new ChatRequestError("Network error — please check your connection and try again.", 0)
  }

  if (!response.ok || !response.body) {
    throw new ChatRequestError(statusMessage(response.status), response.status)
  }

  yield* parseSseStream(response.body)
}

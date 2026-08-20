import { useCallback, useEffect, useReducer, useRef } from "react"
import { toast } from "sonner"
import { postChatCompletion, ChatRequestError, type ChatMessage, type TaskChange } from "@/api/chat"

export interface DisplayMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface ChatState {
  messages: DisplayMessage[]
  streamingMessage: DisplayMessage | null
  changes: TaskChange[]
  status: "idle" | "sending" | "error"
  error: string | null
}

type ChatAction =
  | { type: "SEND_START"; message: DisplayMessage }
  | { type: "DELTA"; text: string }
  | { type: "DONE"; taskChanges: TaskChange[] }
  | { type: "STREAM_ERROR"; message: string }
  | { type: "FATAL_ERROR"; message: string }
  | { type: "CLEAR" }

const initialState: ChatState = {
  messages: [],
  streamingMessage: null,
  changes: [],
  status: "idle",
  error: null,
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SEND_START":
      return {
        ...state,
        messages: [...state.messages, action.message],
        streamingMessage: { id: crypto.randomUUID(), role: "assistant", content: "" },
        status: "sending",
        error: null,
      }
    case "DELTA":
      return state.streamingMessage
        ? { ...state, streamingMessage: { ...state.streamingMessage, content: state.streamingMessage.content + action.text } }
        : state
    case "DONE":
      return {
        ...state,
        messages: state.streamingMessage ? [...state.messages, state.streamingMessage] : state.messages,
        streamingMessage: null,
        changes: [...state.changes, ...action.taskChanges],
        status: "idle",
        error: null,
      }
    // A server-emitted `error` SSE frame is informational, not terminal — the stream keeps
    // delivering deltas afterward and still ends in a normal DONE (see api/chat.ts's "keeps
    // reading after a mid-stream error frame" test). So this only surfaces the message; it must
    // not touch `status`, or isSending would go false mid-turn and let the user send again while
    // the first stream is still writing into streamingMessage.
    case "STREAM_ERROR":
      return { ...state, error: action.message }
    // A thrown exception (network failure, stream parse failure) really does end the turn, so —
    // unlike STREAM_ERROR — this commits whatever partial content exists (same as DONE, so it
    // isn't silently lost if the user immediately sends another message) and returns to idle.
    case "FATAL_ERROR":
      return {
        ...state,
        messages: state.streamingMessage ? [...state.messages, state.streamingMessage] : state.messages,
        streamingMessage: null,
        status: "error",
        error: action.message,
      }
    case "CLEAR":
      return initialState
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function errorMessage(error: unknown): string {
  if (error instanceof ChatRequestError) return error.message
  return "Something went wrong — please try again."
}

export function useChatStream() {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const runStream = useCallback(async (outgoing: ChatMessage[], controller: AbortController) => {
    try {
      for await (const event of postChatCompletion(outgoing, controller.signal)) {
        if (controller.signal.aborted) return
        if (event.type === "content_delta") dispatch({ type: "DELTA", text: event.text })
        if (event.type === "error") dispatch({ type: "STREAM_ERROR", message: event.message })
        if (event.type === "done") dispatch({ type: "DONE", taskChanges: event.taskChanges })
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return
      const message = errorMessage(error)
      dispatch({ type: "FATAL_ERROR", message })
      toast.error(message)
    }
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (trimmed === "" || state.status === "sending") return

      const userMessage: DisplayMessage = { id: crypto.randomUUID(), role: "user", content: trimmed }
      const outgoing: ChatMessage[] = [...state.messages, userMessage].map(({ role, content }) => ({ role, content }))

      const controller = new AbortController()
      controllerRef.current = controller
      dispatch({ type: "SEND_START", message: userMessage })
      void runStream(outgoing, controller)
    },
    [state.messages, state.status, runStream]
  )

  const clear = useCallback(() => {
    controllerRef.current?.abort()
    dispatch({ type: "CLEAR" })
  }, [])

  return {
    messages: state.messages,
    streamingMessage: state.streamingMessage,
    changes: state.changes,
    isSending: state.status === "sending",
    error: state.error,
    sendMessage,
    clear,
  }
}

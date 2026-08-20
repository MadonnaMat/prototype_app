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
  | { type: "ERROR"; message: string }
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
      }
    // Partial streamed content (if any) is left in place rather than discarded — a half-written
    // reply is still useful context for the user even though the turn didn't finish cleanly.
    case "ERROR":
      return { ...state, status: "error", error: action.message }
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
        if (event.type === "error") dispatch({ type: "ERROR", message: event.message })
        if (event.type === "done") dispatch({ type: "DONE", taskChanges: event.taskChanges })
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return
      const message = errorMessage(error)
      dispatch({ type: "ERROR", message })
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

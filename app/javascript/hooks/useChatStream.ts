import { useCallback, useEffect, useReducer, useRef, type Dispatch } from "react"
import { useNavigate, type NavigateFunction } from "react-router"
import { useQueryClient, type QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { postChatCompletion, ChatRequestError, type ChatStreamEvent, type ChatTurn, type ChatUsage, type TaskChange } from "@/api/chat"
import type { Conversation } from "@/api/conversations"
import { useSsrData } from "@/src/TaskApp/routes/ssr-data-context"
import { ssrInitialDataFor } from "@/lib/ssr"
import { useConversationQuery, conversationKeys } from "./useConversationQueries"

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
  isCompacting: boolean
  error: string | null
  usage: ChatUsage | null
  hasCompactionNotice: boolean
  hasHydrated: boolean
}

type ChatAction =
  | { type: "HYDRATE"; messages: DisplayMessage[]; changes: TaskChange[]; usage: ChatUsage | null }
  | { type: "SEND_START"; message: DisplayMessage }
  | { type: "DELTA"; text: string }
  | { type: "COMPACTING" }
  | { type: "DONE"; taskChanges: TaskChange[]; usage: ChatUsage | null; compacted: boolean }
  | { type: "STREAM_ERROR"; message: string }
  | { type: "FATAL_ERROR"; message: string }
  | { type: "STREAM_ENDED_WITHOUT_DONE" }

const initialState: ChatState = {
  messages: [],
  streamingMessage: null,
  changes: [],
  status: "idle",
  isCompacting: false,
  error: null,
  usage: null,
  hasCompactionNotice: false,
  hasHydrated: false,
}

// Shared by DONE and FATAL_ERROR: both end the turn by folding whatever
// streamingMessage exists into messages (so partial content isn't lost).
function commitStreamingMessage(state: ChatState): DisplayMessage[] {
  return state.streamingMessage ? [...state.messages, state.streamingMessage] : state.messages
}

function applyDone(state: ChatState, action: Extract<ChatAction, { type: "DONE" }>): ChatState {
  return {
    ...state,
    messages: commitStreamingMessage(state),
    streamingMessage: null,
    changes: [...state.changes, ...action.taskChanges],
    status: "idle",
    isCompacting: false,
    error: null,
    usage: action.usage ?? state.usage,
    hasCompactionNotice: action.compacted || state.hasCompactionNotice,
  }
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, messages: action.messages, changes: action.changes, usage: action.usage, hasHydrated: true }
    case "SEND_START":
      return {
        ...state,
        messages: [...state.messages, action.message],
        streamingMessage: { id: crypto.randomUUID(), role: "assistant", content: "" },
        status: "sending",
        isCompacting: false,
        error: null,
        hasCompactionNotice: false,
      }
    // Real content can only start after compaction (if any) has fully
    // finished server-side, so this is also the signal that compaction, if
    // it was running, is done — isCompacting is cleared here rather than
    // waiting for DONE so the indicator doesn't linger once text appears.
    case "DELTA":
      return state.streamingMessage
        ? {
            ...state,
            streamingMessage: { ...state.streamingMessage, content: state.streamingMessage.content + action.text },
            isCompacting: false,
          }
        : state
    // Compaction runs server-side before the turn's real reply starts
    // streaming, so this is the only signal the client gets that the delay
    // is compaction specifically and not just a slow first token.
    case "COMPACTING":
      return { ...state, isCompacting: true }
    case "DONE":
      return applyDone(state, action)
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
      return { ...state, messages: commitStreamingMessage(state), streamingMessage: null, status: "error", isCompacting: false, error: action.message }
    // The server can end the stream (a literal [DONE] sentinel) after an :error
    // frame without ever sending a real :done payload — e.g. an unhandled
    // exception mid-turn on the server. Without this, status would stay
    // "sending" forever (see STREAM_ERROR's comment) and every future
    // sendMessage call would silently no-op. state.error was already set by
    // the preceding STREAM_ERROR dispatch, so it's left untouched here.
    case "STREAM_ENDED_WITHOUT_DONE":
      return { ...state, messages: commitStreamingMessage(state), streamingMessage: null, status: "error", isCompacting: false }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function errorMessage(error: unknown): string {
  if (error instanceof ChatRequestError) return error.message
  return "Something went wrong — please try again."
}

interface StreamEventContext {
  dispatch: Dispatch<ChatAction>
  navigate: NavigateFunction
  queryClient: QueryClient
}

// Bumps the conversation's position/updated_at in the already-cached sidebar
// list in place instead of refetching it — the list's row order/timestamp
// are the only things a turn on an existing conversation can change from the
// client's point of view (title changes are handled separately by
// useConversationsQuery's refetchWhileTitlesPending).
function bumpConversationInList(queryClient: QueryClient, conversationId: number) {
  queryClient.setQueryData<Conversation[]>(conversationKeys.lists(), (conversations) => {
    if (!conversations) return conversations
    const updatedAt = new Date().toISOString()
    return conversations
      .map((conversation) => (conversation.id === conversationId ? { ...conversation, updated_at: updatedAt } : conversation))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  })
}

// Returns whether this was the turn's terminal :done event, so runStream can
// tell "the stream ended normally" apart from "the stream just stopped"
// (see STREAM_ENDED_WITHOUT_DONE).
function applyStreamEvent(event: ChatStreamEvent, turn: ChatTurn, { dispatch, navigate, queryClient }: StreamEventContext): boolean {
  switch (event.type) {
    case "content_delta":
      dispatch({ type: "DELTA", text: event.text })
      return false
    case "error":
      dispatch({ type: "STREAM_ERROR", message: event.message })
      return false
    case "compacting":
      dispatch({ type: "COMPACTING" })
      return false
    case "done":
      dispatch({ type: "DONE", taskChanges: event.taskChanges, usage: event.usage, compacted: event.compacted })
      // A brand-new conversation needs a real refetch — it isn't in the
      // cached list at all yet — but an existing one just needs its
      // position/timestamp bumped in place.
      if (turn.conversationId === null) {
        void queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
        navigate(`/assistant/${event.conversationId}`, { replace: true })
      } else {
        bumpConversationInList(queryClient, event.conversationId)
      }
      return true
  }
}

// conversationId is undefined for a brand-new chat (see ChatPage, which
// remounts this hook via a `key` when the id changes rather than handling
// the transition in an effect here).
export function useChatStream(conversationId?: string) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const controllerRef = useRef<AbortController | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { initialConversation } = useSsrData()
  const conversationQuery = useConversationQuery(conversationId, ssrInitialDataFor(conversationId, initialConversation))

  useEffect(() => {
    if (state.hasHydrated) return
    const conversation = conversationQuery.data
    if (!conversation) return

    dispatch({
      type: "HYDRATE",
      messages: conversation.messages.map((message) => ({
        id: String(message.id),
        // The server only ever persists role "user" or "assistant" (see
        // Message::ROLES) — the generated type is a bare `string` because
        // oas_rails' YARD DSL can't express a string-literal union.
        role: message.role as DisplayMessage["role"],
        content: message.content,
      })),
      // Same rationale as the role cast above: TaskChange["action"] is a
      // string-literal union server-side (see ChatOrchestrator::TASK_ACTIONS)
      // that the generated type can't express any more precisely than `string`.
      changes: conversation.messages.flatMap((message) => message.task_changes ?? []) as TaskChange[],
      usage:
        conversation.last_prompt_tokens != null
          ? { promptTokens: conversation.last_prompt_tokens, completionTokens: 0, contextWindow: conversation.context_window }
          : null,
    })
  }, [conversationQuery.data, state.hasHydrated])

  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const runStream = useCallback(
    async (turn: ChatTurn, controller: AbortController) => {
      let sawDone = false
      try {
        for await (const event of postChatCompletion(turn, controller.signal)) {
          if (controller.signal.aborted) return
          if (applyStreamEvent(event, turn, { dispatch, navigate, queryClient })) sawDone = true
        }
        if (!sawDone && !controller.signal.aborted) dispatch({ type: "STREAM_ENDED_WITHOUT_DONE" })
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return
        const message = errorMessage(error)
        dispatch({ type: "FATAL_ERROR", message })
        toast.error(message)
      }
    },
    [navigate, queryClient]
  )

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (trimmed === "" || state.status === "sending") return

      const userMessage: DisplayMessage = { id: crypto.randomUUID(), role: "user", content: trimmed }
      const turn: ChatTurn = { conversationId: conversationId ? Number(conversationId) : null, content: trimmed }

      const controller = new AbortController()
      controllerRef.current = controller
      dispatch({ type: "SEND_START", message: userMessage })
      void runStream(turn, controller)
    },
    [conversationId, state.status, runStream]
  )

  return {
    messages: state.messages,
    streamingMessage: state.streamingMessage,
    changes: state.changes,
    isSending: state.status === "sending",
    // Loading history should stop being "true" once the fetch settles either
    // way — previously this only checked hasHydrated, which a failed fetch
    // (unknown/foreign conversation id, network error) never sets, leaving
    // the UI stuck on a loading indicator forever. notFound covers that case.
    isLoadingHistory: conversationId !== undefined && !state.hasHydrated && !conversationQuery.isError,
    notFound: conversationId !== undefined && conversationQuery.isError,
    isCompacting: state.isCompacting,
    error: state.error,
    usage: state.usage,
    hasCompactionNotice: state.hasCompactionNotice,
    sendMessage,
  }
}

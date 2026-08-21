import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
import { renderWithProviders } from "@/test/render"
import type { DisplayMessage } from "@/hooks/useChatStream"
import { ChatWindow, type ChatWindowProps } from "./ChatWindow"

function renderChatWindow(overrides: Partial<ChatWindowProps> = {}) {
  const onSend = vi.fn()
  const props: ChatWindowProps = {
    messages: [],
    streamingMessage: null,
    isSending: false,
    isLoadingHistory: false,
    isCompacting: false,
    notFound: false,
    error: null,
    usage: null,
    hasCompactionNotice: false,
    onSend,
    ...overrides,
  }
  renderWithProviders(<ChatWindow {...props} />)
  return { onSend }
}

describe("ChatWindow", () => {
  it("shows a placeholder when there are no messages", () => {
    renderChatWindow()

    expect(screen.getByText(/ask the assistant/i)).toBeInTheDocument()
  })

  it("sends the trimmed draft and clears the textarea on submit", () => {
    const { onSend } = renderChatWindow()
    const textarea = screen.getByRole("textbox")

    fireEvent.change(textarea, { target: { value: "  create a task  " } })
    fireEvent.click(screen.getByRole("button", { name: "Send" }))

    expect(onSend).toHaveBeenCalledWith("  create a task  ")
    expect(textarea).toHaveValue("")
  })

  it("submits on Enter but inserts a newline on Shift+Enter", () => {
    const { onSend } = renderChatWindow()
    const textarea = screen.getByRole("textbox")

    fireEvent.change(textarea, { target: { value: "hello" } })
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()

    fireEvent.keyDown(textarea, { key: "Enter" })
    expect(onSend).toHaveBeenCalledWith("hello")
  })

  it("renders the streaming message as the last bubble", () => {
    const streamingMessage: DisplayMessage = { id: "2", role: "assistant", content: "thinking…" }
    renderChatWindow({
      messages: [{ id: "1", role: "user", content: "hi" }],
      streamingMessage,
    })

    expect(screen.getByText("thinking…")).toBeInTheDocument()
  })

  it("shows a spinner in the streaming bubble while waiting for the first token", () => {
    renderChatWindow({
      messages: [{ id: "1", role: "user", content: "hi" }],
      streamingMessage: { id: "2", role: "assistant", content: "" },
    })

    expect(screen.getByRole("status", { name: "Waiting for reply" })).toBeInTheDocument()
  })

  it("shows the inline error message when present", () => {
    renderChatWindow({ error: "Session expired — please log in again." })

    expect(screen.getByText("Session expired — please log in again.")).toBeInTheDocument()
  })

  it("renders the context usage meter once usage is present", () => {
    renderChatWindow({ usage: { promptTokens: 2048, completionTokens: 100, contextWindow: 4096 } })

    expect(screen.getByText("50% of context used")).toBeInTheDocument()
  })

  it("does not render the context usage meter before any usage is known", () => {
    renderChatWindow()

    expect(screen.queryByText(/% of context used/)).not.toBeInTheDocument()
  })

  it("shows a spinner and loading indicator instead of the empty-state placeholder while history is loading", () => {
    renderChatWindow({ isLoadingHistory: true })

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText(/ask the assistant/i)).not.toBeInTheDocument()
  })

  it("shows the empty-state placeholder once history has finished loading with no messages", () => {
    renderChatWindow({ isLoadingHistory: false })

    expect(screen.getByText(/ask the assistant/i)).toBeInTheDocument()
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
  })

  it("shows a compacting indicator in place of the empty streaming bubble", () => {
    renderChatWindow({
      isCompacting: true,
      streamingMessage: { id: "1", role: "assistant", content: "" },
    })

    expect(screen.getByText(/compacting earlier messages/i)).toBeInTheDocument()
  })

  it("does not show the compacting indicator once real content has started streaming", () => {
    renderChatWindow({
      isCompacting: false,
      streamingMessage: { id: "1", role: "assistant", content: "partial reply" },
    })

    expect(screen.queryByText(/compacting earlier messages/i)).not.toBeInTheDocument()
    expect(screen.getByText("partial reply")).toBeInTheDocument()
  })

  it("shows a not-found message instead of any other empty/loading state", () => {
    renderChatWindow({ notFound: true, isLoadingHistory: false })

    expect(screen.getByText(/couldn't be found/i)).toBeInTheDocument()
    expect(screen.queryByText(/ask the assistant/i)).not.toBeInTheDocument()
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument()
  })

  it("disables the composer when the conversation was not found", () => {
    renderChatWindow({ notFound: true })

    expect(screen.getByRole("textbox")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled()
  })
})

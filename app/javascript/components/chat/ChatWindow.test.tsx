import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { renderWithProviders } from "@/test/render"
import type { DisplayMessage } from "@/hooks/useChatStream"
import { ChatWindow, type ChatWindowProps } from "./ChatWindow"

function renderChatWindow(overrides: Partial<ChatWindowProps> = {}) {
  const onSend = vi.fn()
  const onClear = vi.fn()
  const props: ChatWindowProps = {
    messages: [],
    streamingMessage: null,
    isSending: false,
    error: null,
    onSend,
    onClear,
    ...overrides,
  }
  renderWithProviders(<ChatWindow {...props} />)
  return { onSend, onClear }
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

  it("disables the clear trigger when there is nothing to clear", () => {
    renderChatWindow()

    expect(screen.getByRole("button", { name: "Clear conversation" })).toBeDisabled()
  })

  it("opens a confirmation dialog and calls onClear when confirmed", async () => {
    const { onClear } = renderChatWindow({
      messages: [{ id: "1", role: "user", content: "hi" }],
    })

    fireEvent.click(screen.getByRole("button", { name: "Clear conversation" }))
    expect(screen.getByText("Clear this conversation?")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(onClear).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText("Clear this conversation?")).not.toBeInTheDocument())
  })

  it("renders the streaming message as the last bubble", () => {
    const streamingMessage: DisplayMessage = { id: "2", role: "assistant", content: "thinking…" }
    renderChatWindow({
      messages: [{ id: "1", role: "user", content: "hi" }],
      streamingMessage,
    })

    expect(screen.getByText("thinking…")).toBeInTheDocument()
  })

  it("shows the inline error message when present", () => {
    renderChatWindow({ error: "Session expired — please log in again." })

    expect(screen.getByText("Session expired — please log in again.")).toBeInTheDocument()
  })
})

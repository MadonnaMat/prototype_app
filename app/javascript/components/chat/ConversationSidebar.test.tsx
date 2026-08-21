import { describe, it, expect } from "vitest"
import { screen, fireEvent, waitFor, render } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Routes, Route } from "react-router"
import { http, HttpResponse } from "msw"
import { renderWithProviders } from "@/test/render"
import { server } from "@/test/msw/server"
import { buildConversation } from "@/test/msw/handlers"
import { createQueryClient } from "@/lib/query-client"
import { ConversationSidebar } from "./ConversationSidebar"

describe("ConversationSidebar", () => {
  it("renders a New chat link to /assistant", async () => {
    renderWithProviders(<ConversationSidebar />)

    const link = await screen.findByRole("link", { name: "+ New chat" })
    expect(link).toHaveAttribute("href", "/assistant")
  })

  it("lists conversations as links to /assistant/:id", async () => {
    renderWithProviders(<ConversationSidebar />)

    const link = await screen.findByRole("link", { name: "Plan a trip" })
    expect(link).toHaveAttribute("href", "/assistant/1")
  })

  it("marks the active conversation with aria-current", async () => {
    renderWithProviders(<ConversationSidebar activeConversationId="1" />)

    const link = await screen.findByRole("link", { name: "Plan a trip" })
    expect(link).toHaveAttribute("aria-current", "page")
  })

  it("does not mark an inactive conversation with aria-current", async () => {
    renderWithProviders(<ConversationSidebar activeConversationId="999" />)

    const link = await screen.findByRole("link", { name: "Plan a trip" })
    expect(link).not.toHaveAttribute("aria-current")
  })

  it("switches to an inline input when the rename button is clicked", async () => {
    renderWithProviders(<ConversationSidebar />)
    await screen.findByRole("link", { name: "Plan a trip" })

    fireEvent.click(screen.getByRole("button", { name: 'Rename "Plan a trip"' }))

    expect(screen.getByRole("textbox", { name: 'Rename "Plan a trip"' })).toHaveValue("Plan a trip")
  })

  it("cancels the rename on Escape without submitting", async () => {
    renderWithProviders(<ConversationSidebar />)
    await screen.findByRole("link", { name: "Plan a trip" })

    fireEvent.click(screen.getByRole("button", { name: 'Rename "Plan a trip"' }))
    const input = screen.getByRole("textbox", { name: 'Rename "Plan a trip"' })
    fireEvent.change(input, { target: { value: "Something else" } })
    fireEvent.keyDown(input, { key: "Escape" })

    expect(screen.getByRole("link", { name: "Plan a trip" })).toBeInTheDocument()
  })

  it("commits the rename on Enter", async () => {
    renderWithProviders(<ConversationSidebar />)
    await screen.findByRole("link", { name: "Plan a trip" })

    fireEvent.click(screen.getByRole("button", { name: 'Rename "Plan a trip"' }))
    const input = screen.getByRole("textbox", { name: 'Rename "Plan a trip"' })
    fireEvent.change(input, { target: { value: "New title" } })

    // Simulates the server now reflecting the rename, so the mutation's
    // onSettled invalidation refetch has something new to pick up — the
    // default handler is static and wouldn't otherwise show the update.
    server.use(
      http.get("/api/conversations", () =>
        HttpResponse.json({ conversations: [buildConversation({ title: "New title", title_generated: true })], meta: { success: true } })
      )
    )
    fireEvent.keyDown(input, { key: "Enter" })

    await waitFor(() => expect(screen.getByRole("link", { name: "New title" })).toBeInTheDocument())
  })

  it("opens a confirmation dialog and closes it once delete is confirmed", async () => {
    renderWithProviders(<ConversationSidebar />)
    await screen.findByRole("link", { name: "Plan a trip" })

    fireEvent.click(screen.getByRole("button", { name: 'Delete "Plan a trip"' }))
    expect(screen.getByText('Delete "Plan a trip"?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(screen.queryByText('Delete "Plan a trip"?')).not.toBeInTheDocument())
  })

  it("does not attempt a rename when the submitted value is unchanged", async () => {
    renderWithProviders(<ConversationSidebar />)
    await screen.findByRole("link", { name: "Plan a trip" })

    fireEvent.click(screen.getByRole("button", { name: 'Rename "Plan a trip"' }))
    fireEvent.keyDown(screen.getByRole("textbox", { name: 'Rename "Plan a trip"' }), { key: "Enter" })

    expect(screen.getByRole("link", { name: "Plan a trip" })).toBeInTheDocument()
  })

  it("does not attempt a rename when the submitted value is blank", async () => {
    renderWithProviders(<ConversationSidebar />)
    await screen.findByRole("link", { name: "Plan a trip" })

    fireEvent.click(screen.getByRole("button", { name: 'Rename "Plan a trip"' }))
    const input = screen.getByRole("textbox", { name: 'Rename "Plan a trip"' })
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(screen.getByRole("link", { name: "Plan a trip" })).toBeInTheDocument()
  })

  it("navigates to /assistant after deleting the currently-active conversation", async () => {
    const queryClient = createQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/assistant/1"]}>
          <Routes>
            <Route path="/assistant/:conversationId" element={<ConversationSidebar activeConversationId="1" />} />
            <Route path="/assistant" element={<div>New chat landing</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    await screen.findByRole("link", { name: "Plan a trip" })

    fireEvent.click(screen.getByRole("button", { name: 'Delete "Plan a trip"' }))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => expect(screen.getByText("New chat landing")).toBeInTheDocument())
  })
})

import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "@/test/render"
import { ChatPage } from "./ChatPage"

describe("ChatPage", () => {
  it("renders the sidebar, chat window, and the changes list", async () => {
    renderWithProviders(<ChatPage />)

    expect(await screen.findByRole("link", { name: "+ New chat" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Chat" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Recent changes" })).toBeInTheDocument()
    expect(screen.getByText("No changes yet.")).toBeInTheDocument()
  })

  it("renders for a specific conversation route, with that id available via useParams", async () => {
    renderWithProviders(<ChatPage />, { route: "/assistant/1", path: "/assistant/:conversationId" })

    expect(await screen.findByRole("link", { name: "Plan a trip" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("heading", { name: "Chat" })).toBeInTheDocument()
  })
})

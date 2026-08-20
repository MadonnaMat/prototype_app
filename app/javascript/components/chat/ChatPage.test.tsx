import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "@/test/render"
import { ChatPage } from "./ChatPage"

describe("ChatPage", () => {
  it("renders the chat window and the changes list", () => {
    renderWithProviders(<ChatPage />)

    expect(screen.getByRole("heading", { name: "Chat" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Recent changes" })).toBeInTheDocument()
    expect(screen.getByText("No changes yet.")).toBeInTheDocument()
  })
})

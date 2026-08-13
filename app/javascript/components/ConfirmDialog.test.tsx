import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ConfirmDialog } from "./ConfirmDialog"

describe("ConfirmDialog", () => {
  it("renders nothing visible when closed", () => {
    render(
      <ConfirmDialog open={false} onOpenChange={vi.fn()} title="Discard changes?" description="desc" onConfirm={vi.fn()} />
    )

    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument()
  })

  it("shows title/description when open", () => {
    render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="Discard changes?" description="desc text" onConfirm={vi.fn()} />
    )

    expect(screen.getByText("Discard changes?")).toBeInTheDocument()
    expect(screen.getByText("desc text")).toBeInTheDocument()
  })

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onOpenChange={vi.fn()} title="t" description="d" confirmLabel="Discard" onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole("button", { name: "Discard" }))

    expect(onConfirm).toHaveBeenCalled()
  })

  it("calls onOpenChange(false) when cancel is clicked", () => {
    const onOpenChange = vi.fn()
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="t" description="d" onConfirm={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    // Base UI's onOpenChange also passes event-detail metadata as a second arg.
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
  })
})

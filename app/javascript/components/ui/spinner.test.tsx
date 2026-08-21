import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Spinner, PendingLabel } from "./spinner"

describe("Spinner", () => {
  it("is decorative by default (aria-hidden, no accessible name)", () => {
    const { container } = render(<Spinner />)

    const icon = container.querySelector("[data-slot='spinner']")
    expect(icon).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("can be given its own accessible label when used with no adjacent text", () => {
    render(<Spinner role="status" aria-label="Waiting for reply" aria-hidden={undefined} />)

    expect(screen.getByRole("status", { name: "Waiting for reply" })).toBeInTheDocument()
  })
})

describe("PendingLabel", () => {
  it("renders the label text with a decorative spinner", () => {
    const { container } = render(<PendingLabel>Deleting…</PendingLabel>)

    expect(screen.getByText("Deleting…")).toBeInTheDocument()
    expect(container.querySelector("[data-slot='spinner']")).toHaveAttribute("aria-hidden", "true")
  })

  it("wraps itself in a status live region so screen readers announce the text", () => {
    render(<PendingLabel>Saving…</PendingLabel>)

    expect(screen.getByRole("status")).toHaveTextContent("Saving…")
  })

  it("does not leak the icon into the wrapping element's accessible name", () => {
    render(
      <button>
        <PendingLabel>Saving…</PendingLabel>
      </button>
    )

    expect(screen.getByRole("button", { name: "Saving…" })).toBeInTheDocument()
  })
})

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import HelloWorld from "./HelloWorld"

describe("HelloWorld", () => {
  it("renders the greeting with the given name", () => {
    render(<HelloWorld name="Rails" />)
    expect(
      screen.getByText("Hello, Rails! React 19 is rendering this component.")
    ).toBeInTheDocument()
  })

  it("renders the shadcn Button", () => {
    render(<HelloWorld name="Rails" />)
    expect(screen.getByRole("button", { name: "shadcn Button" })).toBeInTheDocument()
  })
})

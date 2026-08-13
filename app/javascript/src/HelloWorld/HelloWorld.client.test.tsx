import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import HelloWorld from "./ror_components/HelloWorld.client"

describe("HelloWorld", () => {
  it("greets the name passed in via props", () => {
    render(<HelloWorld name="Rails" />)
    expect(screen.getByRole("heading", { name: "Hello, Rails!" })).toBeInTheDocument()
  })

  it("updates the greeting as the input changes", () => {
    render(<HelloWorld name="Rails" />)
    const input = screen.getByLabelText("Say hello to:")
    fireEvent.change(input, { target: { value: "World" } })
    expect(screen.getByRole("heading", { name: "Hello, World!" })).toBeInTheDocument()
  })
})

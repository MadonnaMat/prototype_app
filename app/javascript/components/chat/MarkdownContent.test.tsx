import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MarkdownContent } from "./MarkdownContent"

describe("MarkdownContent", () => {
  it("renders bold and italic emphasis", () => {
    render(<MarkdownContent content="**bold** and _italic_" />)

    expect(screen.getByText("bold").tagName).toBe("STRONG")
    expect(screen.getByText("italic").tagName).toBe("EM")
  })

  it("renders a bullet list", () => {
    render(<MarkdownContent content={"- First\n- Second"} />)

    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["First", "Second"])
  })

  it("renders a link with target=_blank", () => {
    render(<MarkdownContent content="[Task App](https://example.com)" />)

    expect(screen.getByRole("link", { name: "Task App" })).toHaveAttribute("href", "https://example.com")
    expect(screen.getByRole("link", { name: "Task App" })).toHaveAttribute("target", "_blank")
  })

  it("renders an inline code span", () => {
    render(<MarkdownContent content="Use `list_tasks` to find it." />)

    expect(screen.getByText("list_tasks").tagName).toBe("CODE")
  })

  it("does not render raw HTML in the source", () => {
    render(<MarkdownContent content='<img src="x" onerror="alert(1)">' />)

    expect(document.querySelector("img")).not.toBeInTheDocument()
  })
})

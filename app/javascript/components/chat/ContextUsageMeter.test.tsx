import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ContextUsageMeter } from "./ContextUsageMeter"

describe("ContextUsageMeter", () => {
  it("renders nothing when usage is null", () => {
    const { container } = render(<ContextUsageMeter usage={null} hasCompactionNotice={false} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("shows the percentage of context used", () => {
    render(<ContextUsageMeter usage={{ promptTokens: 1024, completionTokens: 50, contextWindow: 4096 }} hasCompactionNotice={false} />)

    expect(screen.getByText("25% of context used")).toBeInTheDocument()
  })

  it("clamps the percentage at 100 when usage exceeds the context window", () => {
    render(<ContextUsageMeter usage={{ promptTokens: 5000, completionTokens: 0, contextWindow: 4096 }} hasCompactionNotice={false} />)

    expect(screen.getByText("100% of context used")).toBeInTheDocument()
  })

  it("shows the compaction notice when present", () => {
    render(
      <ContextUsageMeter usage={{ promptTokens: 1024, completionTokens: 0, contextWindow: 4096 }} hasCompactionNotice={true} />
    )

    expect(screen.getByText("Earlier messages were summarized to save context.")).toBeInTheDocument()
  })

  it("does not show a compaction notice when absent", () => {
    render(<ContextUsageMeter usage={{ promptTokens: 1024, completionTokens: 0, contextWindow: 4096 }} hasCompactionNotice={false} />)

    expect(screen.queryByText(/summarized/)).not.toBeInTheDocument()
  })
})

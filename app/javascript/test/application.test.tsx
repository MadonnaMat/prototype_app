import { describe, it, expect, beforeEach } from "vitest"
import { waitFor } from "@testing-library/react"

describe("application entry point", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("mounts HelloWorld into #react-root when present", async () => {
    document.body.innerHTML = '<div id="react-root"></div>'
    await import("../application")
    document.dispatchEvent(new Event("DOMContentLoaded"))

    await waitFor(() => {
      expect(document.getElementById("react-root")?.textContent).toContain(
        "Hello, Rails!"
      )
    })
  })

  it("does nothing when #react-root is absent", async () => {
    await import("../application")
    expect(() =>
      document.dispatchEvent(new Event("DOMContentLoaded"))
    ).not.toThrow()
  })
})

import "@testing-library/jest-dom/vitest"
import { afterAll, afterEach, beforeAll } from "vitest"
import { cleanup } from "@testing-library/react"
import { server } from "./msw/server"

// jsdom doesn't implement matchMedia; sonner's Toaster (system theme/reduced-motion
// detection) and next-themes both call it on mount.
window.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})

// jsdom doesn't implement scrollIntoView; ChatWindow calls it to keep the message list
// pinned to the bottom as new content streams in.
Element.prototype.scrollIntoView ??= () => {}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

afterEach(() => {
  server.resetHandlers()
  cleanup()
})

afterAll(() => server.close())

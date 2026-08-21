import type { ReactElement, ReactNode } from "react"
import { render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Routes, Route } from "react-router"
import { createQueryClient } from "@/lib/query-client"
import { AuthProvider } from "@/contexts/AuthContext"

export function createQueryWrapper(queryClient: QueryClient = createQueryClient()) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

interface RenderWithProvidersOptions {
  route?: string
  /** A route pattern (e.g. "/assistant/:conversationId") to match `ui` against, so
   * hooks like useParams() populate. Omit to render `ui` directly (the default). */
  path?: string
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", path, queryClient = createQueryClient() }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  const element = path ? <Routes><Route path={path} element={ui} /></Routes> : ui
  return { queryClient, ...render(element, { wrapper: Wrapper }) }
}

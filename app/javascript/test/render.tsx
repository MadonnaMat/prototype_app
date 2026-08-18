import type { ReactElement, ReactNode } from "react"
import { render } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { createQueryClient } from "@/lib/query-client"
import { AuthProvider } from "@/contexts/AuthContext"

export function createQueryWrapper(queryClient: QueryClient = createQueryClient()) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

interface RenderWithProvidersOptions {
  route?: string
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", queryClient = createQueryClient() }: RenderWithProvidersOptions = {}
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

  return { queryClient, ...render(ui, { wrapper: Wrapper }) }
}

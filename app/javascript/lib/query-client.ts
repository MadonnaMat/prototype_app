import { QueryClient } from "@tanstack/react-query"

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // SSR seeds initialData on first render; a nonzero staleTime keeps React Query
      // from immediately refetching (and discarding) it the moment the component mounts.
      queries: { retry: false, staleTime: 30_000 },
    },
  })
}

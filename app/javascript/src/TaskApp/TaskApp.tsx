import { useState, useSyncExternalStore } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createQueryClient } from "@/lib/query-client"
import { Toaster } from "@/components/ui/sonner"
import { SsrDataContext, type SsrData } from "./routes/ssr-data-context"
import { AppRoutes } from "./routes/AppRoutes"

export type TaskAppProps = SsrData

// Hydration-safe "are we on the client yet" check: returns false for both the SSR
// render and React's first client render (so they match), then true afterward.
// See https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering
function useIsHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function TaskApp(props: TaskAppProps) {
  const [queryClient] = useState(() => createQueryClient())
  const isHydrated = useIsHydrated()

  return (
    <QueryClientProvider client={queryClient}>
      <SsrDataContext.Provider value={props}>
        <AppRoutes />
        <Toaster />
        {isHydrated && process.env.NODE_ENV !== "production" && <ReactQueryDevtools initialIsOpen={false} />}
      </SsrDataContext.Provider>
    </QueryClientProvider>
  )
}

import { useState } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createQueryClient } from "@/lib/query-client"
import { Toaster } from "@/components/ui/sonner"
import { SsrDataContext, type SsrData } from "./routes/ssr-data-context"
import { AppRoutes } from "./routes/AppRoutes"

export type TaskAppProps = SsrData

export function TaskApp(props: TaskAppProps) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SsrDataContext.Provider value={props}>
        <AppRoutes />
        <Toaster />
        {typeof window !== "undefined" && process.env.NODE_ENV !== "production" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </SsrDataContext.Provider>
    </QueryClientProvider>
  )
}

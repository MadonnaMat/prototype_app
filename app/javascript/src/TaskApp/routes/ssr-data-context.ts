import { createContext, useContext } from "react"
import type { Task } from "@/api/tasks"

export interface SsrData {
  initialTasks?: Task[]
  initialTask?: Task
}

export const SsrDataContext = createContext<SsrData>({})

export function useSsrData(): SsrData {
  return useContext(SsrDataContext)
}

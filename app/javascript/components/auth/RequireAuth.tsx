import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/contexts/AuthContext"

export function RequireAuth() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <div className="mx-auto max-w-lg p-4">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

import { Navigate, Outlet } from "react-router"
import { PendingLabel } from "@/components/ui/spinner"
import { useAuth } from "@/contexts/AuthContext"

export function RequireAuth() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <PendingLabel>Loading…</PendingLabel>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

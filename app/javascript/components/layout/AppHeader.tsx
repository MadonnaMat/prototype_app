import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-lg items-center justify-between p-4">
        <Link to="/" className="font-semibold">
          Task App
        </Link>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <Link to="/assistant" className="text-muted-foreground hover:text-foreground">
              Chat
            </Link>
            <Link to="/account" className="text-muted-foreground hover:text-foreground">
              {user.username}
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={() => logout()}>
              Log out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link to="/register" className="text-muted-foreground hover:text-foreground">
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

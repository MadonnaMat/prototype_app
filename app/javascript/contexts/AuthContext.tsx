import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  fetchAccount,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type LoginInput,
  type RegisterInput,
  type User,
} from "@/api/auth"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (data: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Resolves auth state client-side via the session cookie (if any) — this
  // can't be known during SSR (no request-scoped auth lookup is wired into
  // PagesController), so protected routes briefly show a loading state on
  // first paint rather than the real content, until this resolves.
  useEffect(() => {
    fetchAccount()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function login(data: LoginInput) {
    setUser(await loginRequest(data))
  }

  async function register(data: RegisterInput) {
    setUser(await registerRequest(data))
  }

  async function logout() {
    await logoutRequest()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

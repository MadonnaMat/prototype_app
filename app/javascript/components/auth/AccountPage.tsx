import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { regenerateToken, updateAccount } from "@/api/auth"
import { ApiValidationError } from "@/api/client"

export function AccountPage() {
  const { user, setUser } = useAuth()
  const [username, setUsername] = useState("")
  const [syncedUserId, setSyncedUserId] = useState<number | null>(null)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState<string>()
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // user starts null (auth resolves asynchronously), so the username field
  // can't be initialized from it up front. Adjust it during render once a
  // (newly-loaded or re-fetched) user arrives, per React's guidance for
  // syncing state from props/context without an effect.
  if (user && user.id !== syncedUserId) {
    setSyncedUserId(user.id)
    setUsername(user.username)
  }

  if (!user) return null

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingUsername(true)
    setUsernameError(undefined)
    try {
      setUser(await updateAccount({ username }))
    } catch (err) {
      setUsernameError(
        err instanceof ApiValidationError ? err.errors.username?.join(", ") : "Could not update username."
      )
    } finally {
      setIsSavingUsername(false)
    }
  }

  async function handleRegenerate() {
    setIsRegenerating(true)
    setCopied(false)
    try {
      setUser(await regenerateToken())
    } finally {
      setIsRegenerating(false)
    }
  }

  async function handleCopy() {
    if (!user?.api_token) return
    await navigator.clipboard.writeText(user.api_token)
    setCopied(true)
  }

  return (
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Account</h1>

      <section className="mb-6">
        <p className="mb-1 text-sm text-muted-foreground">Email</p>
        <p>{user.email_address}</p>
      </section>

      <form onSubmit={handleUsernameSubmit} className="mb-6 flex flex-col gap-1.5">
        <Label htmlFor="account-username">Username</Label>
        <Input id="account-username" value={username} onChange={(event) => setUsername(event.target.value)} />
        {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
        <Button type="submit" size="sm" className="self-start" disabled={isSavingUsername}>
          {isSavingUsername ? "Saving…" : "Save username"}
        </Button>
      </form>

      <section className="flex flex-col gap-2">
        <Label>API token</Label>
        <p className="text-sm text-muted-foreground">
          Use this as a Bearer token to connect the MCP server or call the JSON API directly. It&apos;s only ever
          shown right after you generate it.
        </p>
        {user.api_token ? (
          <div className="flex gap-2">
            <Input readOnly value={user.api_token} aria-label="API token" />
            <Button type="button" variant="outline" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No token currently visible — regenerate to get one.</p>
        )}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={handleRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? "Regenerating…" : "Regenerate token"}
        </Button>
      </section>
    </div>
  )
}

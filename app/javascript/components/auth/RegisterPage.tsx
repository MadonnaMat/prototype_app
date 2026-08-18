import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { ApiValidationError, ApiRequestError } from "@/api/client"

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [emailAddress, setEmailAddress] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>()
  const [error, setError] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(undefined)
    setFieldErrors(undefined)
    try {
      await register({
        username,
        email_address: emailAddress,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate("/")
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.errors)
      } else {
        setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Register</h1>
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-username">Username</Label>
          <Input
            id="register-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            aria-invalid={Boolean(fieldErrors?.username)}
          />
          {fieldErrors?.username && (
            <p className="text-sm text-destructive">{fieldErrors.username.join(", ")}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            value={emailAddress}
            onChange={(event) => setEmailAddress(event.target.value)}
            aria-invalid={Boolean(fieldErrors?.email_address)}
          />
          {fieldErrors?.email_address && (
            <p className="text-sm text-destructive">{fieldErrors.email_address.join(", ")}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password-confirmation">Confirm password</Label>
          <Input
            id="register-password-confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registering…" : "Register"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

import { describe, it, expect } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { buildUser } from "@/test/msw/handlers"
import { login, register, logout, fetchAccount, updateAccount, regenerateToken } from "./auth"
import { ApiRequestError, ApiValidationError } from "./client"

describe("login", () => {
  it("returns the logged-in user", async () => {
    const user = await login({ email_address: "one@example.com", password: "password" })
    expect(user.username).toBe("testuser")
  })

  it("throws ApiRequestError on invalid credentials", async () => {
    server.use(
      http.post("/api/session", () =>
        HttpResponse.json({ meta: { success: false, error: "Invalid email or password" } }, { status: 401 })
      )
    )

    const error = await login({ email_address: "one@example.com", password: "wrong" }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).message).toBe("Invalid email or password")
  })
})

describe("register", () => {
  it("returns the newly registered user with an api_token", async () => {
    const user = await register({
      username: "newuser",
      email_address: "new@example.com",
      password: "password",
      password_confirmation: "password",
    })
    expect(user.api_token).toBe("generated-token")
  })

  it("throws ApiValidationError on a taken username", async () => {
    server.use(
      http.post("/api/registration", () =>
        HttpResponse.json({ meta: { success: false, errors: { username: ["has already been taken"] } } }, { status: 422 })
      )
    )

    const error = await register({
      username: "taken",
      email_address: "new@example.com",
      password: "password",
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiValidationError)
    expect((error as ApiValidationError).errors).toEqual({ username: ["has already been taken"] })
  })
})

describe("logout", () => {
  it("resolves on success", async () => {
    await expect(logout()).resolves.toBeUndefined()
  })
})

describe("fetchAccount", () => {
  it("returns the current user", async () => {
    const user = await fetchAccount()
    expect(user).toEqual(buildUser())
  })

  it("throws ApiRequestError when unauthenticated", async () => {
    server.use(
      http.get("/api/account", () =>
        HttpResponse.json({ meta: { success: false, error: "Unauthenticated" } }, { status: 401 })
      )
    )

    const error = await fetchAccount().catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiRequestError)
  })
})

describe("updateAccount", () => {
  it("returns the updated user", async () => {
    const user = await updateAccount({ username: "renamed" })
    expect(user.username).toBe("renamed")
  })
})

describe("regenerateToken", () => {
  it("returns a fresh api_token", async () => {
    const user = await regenerateToken()
    expect(user.api_token).toBe("regenerated-token")
  })
})

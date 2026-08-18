import type { paths } from "@/types/api"
import { apiRequest } from "./client"

type LoginBody = paths["/api/session"]["post"]["responses"][201]["content"]["application/json"]
type RegisterBody = paths["/api/registration"]["post"]["responses"][201]["content"]["application/json"]
type AccountBody = paths["/api/account"]["get"]["responses"][200]["content"]["application/json"]
type AccountUpdateBody = paths["/api/account"]["patch"]["responses"][200]["content"]["application/json"]
type RegenerateTokenBody = paths["/api/account/regenerate_token"]["post"]["responses"][200]["content"]["application/json"]

export type User = NonNullable<AccountBody["user"]>
export type LoginInput = paths["/api/session"]["post"]["requestBody"]["content"]["application/json"]
export type RegisterInput = paths["/api/registration"]["post"]["requestBody"]["content"]["application/json"]
export type AccountUpdateInput = NonNullable<
  paths["/api/account"]["patch"]["requestBody"]
>["content"]["application/json"]

export function login(data: LoginInput): Promise<User> {
  return apiRequest<LoginBody>("/session", { method: "POST", body: JSON.stringify(data) }).then(
    (body) => body.user as User
  )
}

export function register(data: RegisterInput): Promise<User> {
  return apiRequest<RegisterBody>("/registration", { method: "POST", body: JSON.stringify(data) }).then(
    (body) => body.user as User
  )
}

export function logout(): Promise<void> {
  return apiRequest("/session", { method: "DELETE" }).then(() => undefined)
}

export function fetchAccount(): Promise<User> {
  return apiRequest<AccountBody>("/account").then((body) => body.user as User)
}

export function updateAccount(data: AccountUpdateInput): Promise<User> {
  return apiRequest<AccountUpdateBody>("/account", { method: "PATCH", body: JSON.stringify(data) }).then(
    (body) => body.user as User
  )
}

export function regenerateToken(): Promise<User> {
  return apiRequest<RegenerateTokenBody>("/account/regenerate_token", { method: "POST" }).then(
    (body) => body.user as User
  )
}

import { describe, it, expect } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/test/msw/server"
import { apiRequest, ApiValidationError, ApiRequestError } from "./client"

describe("apiRequest", () => {
  it("returns the parsed JSON body on success", async () => {
    server.use(http.get("/api/widgets", () => HttpResponse.json({ widgets: [], meta: { success: true } })))

    const body = await apiRequest<{ widgets: unknown[] }>("/widgets")

    expect(body.widgets).toEqual([])
  })

  it("throws ApiValidationError with field errors on 422", async () => {
    server.use(
      http.post("/api/widgets", () =>
        HttpResponse.json({ meta: { success: false, errors: { name: ["can't be blank"] } } }, { status: 422 })
      )
    )

    const error = await apiRequest("/widgets", { method: "POST" }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiValidationError)
    expect((error as ApiValidationError).errors).toEqual({ name: ["can't be blank"] })
  })

  it("throws ApiRequestError with the message and status on other errors", async () => {
    server.use(
      http.get("/api/widgets/1", () => HttpResponse.json({ meta: { success: false, error: "Not found" } }, { status: 404 }))
    )

    const error = await apiRequest("/widgets/1").catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiRequestError)
    expect((error as ApiRequestError).message).toBe("Not found")
    expect((error as ApiRequestError).status).toBe(404)
  })
})

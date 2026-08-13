import { describe, it, expect } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { createQueryWrapper } from "@/test/render"
import { taskKeys, useTasksQuery, useTaskQuery } from "./useTaskQueries"

describe("useTasksQuery", () => {
  it("fetches the task list", async () => {
    const { result } = renderHook(() => useTasksQuery(), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
  })

  it("seeds from initialData without waiting on a fetch", () => {
    const { result } = renderHook(
      () =>
        useTasksQuery([
          { id: 9, title: "Seeded", description: "", done: false, created_at: "", updated_at: "" },
        ]),
      { wrapper: createQueryWrapper() }
    )

    expect(result.current.data?.[0].title).toBe("Seeded")
  })
})

describe("useTaskQuery", () => {
  it("fetches a single task by id", async () => {
    const { result } = renderHook(() => useTaskQuery(7), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe(7)
  })

  it("does not fetch when id is an empty string", () => {
    const { result } = renderHook(() => useTaskQuery(""), { wrapper: createQueryWrapper() })

    expect(result.current.fetchStatus).toBe("idle")
  })
})

describe("taskKeys", () => {
  it("builds distinct list/detail keys", () => {
    expect(taskKeys.lists()).toEqual(["tasks", "list"])
    expect(taskKeys.detail(3)).toEqual(["tasks", "detail", 3])
  })
})

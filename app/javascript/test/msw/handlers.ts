import { http, HttpResponse } from "msw"
import type { Task, TaskInput } from "@/api/tasks"

export function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Write project proposal",
    description: "Draft the initial scope and timeline for review.",
    done: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

export const handlers = [
  http.get("/api/tasks", () => HttpResponse.json({ tasks: [buildTask()], meta: { success: true } })),

  http.get("/api/tasks/:id", ({ params }) =>
    HttpResponse.json({ task: buildTask({ id: Number(params.id) }), meta: { success: true } })
  ),

  http.post("/api/tasks", async ({ request }) => {
    const { task } = (await request.json()) as { task: TaskInput }
    if (!task.title) {
      return HttpResponse.json(
        { meta: { success: false, errors: { title: ["can't be blank"] } } },
        { status: 422 }
      )
    }
    return HttpResponse.json({ task: buildTask({ ...task, id: 2 }), meta: { success: true } }, { status: 201 })
  }),

  http.patch("/api/tasks/:id", async ({ params, request }) => {
    const { task } = (await request.json()) as { task: TaskInput }
    if (!task.title) {
      return HttpResponse.json(
        { meta: { success: false, errors: { title: ["can't be blank"] } } },
        { status: 422 }
      )
    }
    return HttpResponse.json({ task: buildTask({ ...task, id: Number(params.id) }), meta: { success: true } })
  }),

  http.delete("/api/tasks/:id", () => HttpResponse.json({ meta: { success: true } })),
]

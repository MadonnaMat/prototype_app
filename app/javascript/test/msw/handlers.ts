import { http, HttpResponse } from "msw"
import type { Task, TaskInput } from "@/api/tasks"
import type { User } from "@/api/auth"
import type { Conversation, ConversationDetail } from "@/api/conversations"

export function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Write project proposal",
    description: "Draft the initial scope and timeline for review.",
    done: false,
    is_public: false,
    owner_username: "testuser",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

export function buildConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 1,
    title: "Plan a trip",
    title_generated: true,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

export function buildConversationDetail(overrides: Partial<ConversationDetail> = {}): ConversationDetail {
  return {
    ...buildConversation(),
    last_prompt_tokens: undefined,
    context_window: 4096,
    messages: [],
    ...overrides,
  }
}

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: "testuser",
    email_address: "testuser@example.com",
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

  http.get("/api/conversations", () => HttpResponse.json({ conversations: [buildConversation()], meta: { success: true } })),

  http.get("/api/conversations/:id", ({ params }) =>
    HttpResponse.json({ conversation: buildConversationDetail({ id: Number(params.id) }), meta: { success: true } })
  ),

  http.patch("/api/conversations/:id", async ({ params, request }) => {
    const { conversation } = (await request.json()) as { conversation: { title?: string } }
    if (!conversation.title) {
      return HttpResponse.json({ meta: { success: false, errors: { title: ["can't be blank"] } } }, { status: 422 })
    }
    return HttpResponse.json(
      { conversation: buildConversation({ id: Number(params.id), title: conversation.title, title_generated: true }), meta: { success: true } }
    )
  }),

  http.delete("/api/conversations/:id", () => HttpResponse.json({ meta: { success: true } })),

  // Default: authenticated as buildUser() — most tests don't care about auth
  // and would otherwise all need to opt into a logged-in state individually.
  // Tests exercising the logged-out/auth-flow path override this via server.use(...).
  http.get("/api/account", () => HttpResponse.json({ user: buildUser(), meta: { success: true } })),

  http.post("/api/session", () => HttpResponse.json({ user: buildUser(), meta: { success: true } }, { status: 201 })),

  http.delete("/api/session", () => HttpResponse.json({ meta: { success: true } })),

  http.post("/api/registration", () =>
    HttpResponse.json({ user: buildUser({ api_token: "generated-token" }), meta: { success: true } }, { status: 201 })
  ),

  http.patch("/api/account", async ({ request }) => {
    const body = (await request.json()) as { username?: string }
    return HttpResponse.json({ user: buildUser({ username: body.username }), meta: { success: true } })
  }),

  http.post("/api/account/regenerate_token", () =>
    HttpResponse.json({ user: buildUser({ api_token: "regenerated-token" }), meta: { success: true } })
  ),
]

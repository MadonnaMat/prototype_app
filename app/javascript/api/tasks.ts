import type { paths } from "@/types/api"
import { apiRequest } from "./client"

type TaskListBody = paths["/api/tasks"]["get"]["responses"][200]["content"]["application/json"]
type TaskShowBody = paths["/api/tasks/{id}"]["get"]["responses"][200]["content"]["application/json"]
type TaskCreateBody = paths["/api/tasks"]["post"]["responses"][201]["content"]["application/json"]
type TaskUpdateBody = paths["/api/tasks/{id}"]["patch"]["responses"][200]["content"]["application/json"]

export type Task = NonNullable<TaskListBody["tasks"]>[number]
export type TaskInput = paths["/api/tasks"]["post"]["requestBody"]["content"]["application/json"]

export function listTasks(): Promise<Task[]> {
  return apiRequest<TaskListBody>("/tasks").then((body) => body.tasks ?? [])
}

export function getTask(id: number | string): Promise<Task> {
  return apiRequest<TaskShowBody>(`/tasks/${id}`).then((body) => body.task as Task)
}

export function createTask(data: TaskInput): Promise<Task> {
  return apiRequest<TaskCreateBody>("/tasks", {
    method: "POST",
    body: JSON.stringify({ task: data }),
  }).then((body) => body.task as Task)
}

export function updateTask(id: number | string, data: TaskInput): Promise<Task> {
  return apiRequest<TaskUpdateBody>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ task: data }),
  }).then((body) => body.task as Task)
}

export function deleteTask(id: number | string): Promise<void> {
  return apiRequest(`/tasks/${id}`, { method: "DELETE" }).then(() => undefined)
}

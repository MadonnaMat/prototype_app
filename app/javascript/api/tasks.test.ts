import { describe, it, expect } from "vitest"
import { ApiValidationError } from "./client"
import { listTasks, getTask, createTask, updateTask, deleteTask } from "./tasks"

describe("tasks api", () => {
  it("listTasks returns the tasks array", async () => {
    const tasks = await listTasks()

    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe("Write project proposal")
  })

  it("getTask returns a single task matching the requested id", async () => {
    const task = await getTask(5)

    expect(task.id).toBe(5)
  })

  it("createTask posts the payload and returns the created task", async () => {
    const task = await createTask({ title: "New task", description: "", done: false })

    expect(task.title).toBe("New task")
  })

  it("updateTask patches the task and returns the updated task", async () => {
    const task = await updateTask(3, { title: "Updated", done: true })

    expect(task.id).toBe(3)
    expect(task.title).toBe("Updated")
  })

  it("deleteTask resolves with no value", async () => {
    await expect(deleteTask(1)).resolves.toBeUndefined()
  })

  it("surfaces validation errors from createTask", async () => {
    const error = await createTask({ title: "" }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiValidationError)
  })
})

import { describe, it, expect } from "vitest"
import { ApiValidationError } from "./client"
import { listConversations, getConversation, renameConversation, deleteConversation } from "./conversations"

describe("conversations api", () => {
  it("listConversations returns the conversations array", async () => {
    const conversations = await listConversations()

    expect(conversations).toHaveLength(1)
    expect(conversations[0].title).toBe("Plan a trip")
  })

  it("getConversation returns a single conversation matching the requested id, with its messages", async () => {
    const conversation = await getConversation(5)

    expect(conversation.id).toBe(5)
    expect(conversation.messages).toEqual([])
  })

  it("renameConversation patches the title and returns the updated conversation", async () => {
    const conversation = await renameConversation(3, "New title")

    expect(conversation.id).toBe(3)
    expect(conversation.title).toBe("New title")
    expect(conversation.title_generated).toBe(true)
  })

  it("deleteConversation resolves with no value", async () => {
    await expect(deleteConversation(1)).resolves.toBeUndefined()
  })

  it("surfaces validation errors from renameConversation", async () => {
    const error = await renameConversation(1, "").catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiValidationError)
  })
})

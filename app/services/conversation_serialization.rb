module ConversationSerialization
  module_function

  def conversation_list_json(conversation)
    conversation.as_json(only: %i[id title title_generated updated_at])
  end

  def conversation_show_json(conversation)
    conversation_list_json(conversation).merge(
      last_prompt_tokens: conversation.last_prompt_tokens,
      context_window: Rails.application.config.x.ollama_context_window,
      messages: conversation.messages.map { |message| message_json(message) }
    )
  end

  # task_changes is nullable in the DB (only ever set on assistant messages
  # that touched a task) — normalized to `[]` here so the wire contract is
  # always an array, never null.
  def message_json(message)
    message.as_json(only: %i[id role content created_at]).merge(task_changes: message.task_changes || [])
  end
end

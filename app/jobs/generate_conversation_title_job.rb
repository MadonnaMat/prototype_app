# Replaces a Conversation's synchronous placeholder title (set from a
# truncated first message, see ChatController#find_or_create_conversation)
# with an LLM-generated one. Runs async so this never delays the first
# message's streamed reply. Any failure still flips title_generated to true
# so the placeholder becomes permanent and frontend polling terminates —
# conversation creation never depends on this succeeding.
class GenerateConversationTitleJob < ApplicationJob
  queue_as :default

  def perform(conversation_id)
    conversation = Conversation.find_by(id: conversation_id)
    return unless conversation
    return if conversation.title_generated? # already renamed manually (or ran already) — never clobber

    title = generate_title(conversation)
    conversation.update!(title: title, title_generated: true) if title.present?
  rescue StandardError => e
    Rails.logger.warn("GenerateConversationTitleJob failed for conversation #{conversation_id}: #{e.message}")
  ensure
    # Guarantees this job always leaves title_generated: true — whether it
    # succeeded, got a blank title, or raised — so the placeholder title
    # becomes permanent and frontend polling (refetchWhileTitlesPending)
    # terminates either way, from one place instead of three.
    conversation&.update!(title_generated: true) unless conversation&.title_generated?
  end

  private

  def generate_title(conversation)
    first_message = conversation.messages.first
    ChatProviders.complete(messages: title_messages(first_message)).strip.delete_prefix('"').delete_suffix('"').truncate(60)
  end

  def title_messages(first_message)
    [
      { role: "system", content: PromptLoader.load("chat_title_prompt") },
      { role: "user", content: first_message.content }
    ]
  end
end

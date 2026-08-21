# Folds the oldest messages of a long-running conversation into a condensed
# summary so future turns can stay under the model's context window, without
# ever touching what's persisted in the messages table — only what
# ChatController assembles to SEND to the model changes. Summaries compound:
# each run re-summarizes the prior summary plus whatever's newly old.
class ConversationCompactor
  THRESHOLD = 0.8
  KEEP_RECENT = 6

  def self.needed?(conversation, context_window:)
    conversation.last_prompt_tokens && conversation.last_prompt_tokens >= context_window * THRESHOLD
  end

  def initialize(conversation:)
    @conversation = conversation
  end

  # Returns the trailing KEEP_RECENT messages actually kept when compaction
  # runs, or nil when it no-ops (so callers can tell the two apart instead of
  # assuming success — see ChatController#compact_if_needed!) and reuse the
  # already-loaded messages instead of re-querying them.
  def call!
    pending = @conversation.messages.after(@conversation.compacted_through_message_id).to_a
    return nil if pending.size <= KEEP_RECENT

    to_keep = pending.last(KEEP_RECENT)
    to_summarize = pending.first(pending.size - KEEP_RECENT)
    @conversation.update!(summary_text: generate_summary(to_summarize), compacted_through_message_id: to_summarize.last.id)
    to_keep
  end

  private

  def generate_summary(messages)
    ChatProviders.complete(messages: prompt_messages(messages)).strip.presence || fallback_summary(messages)
  rescue StandardError => e
    Rails.logger.warn("ConversationCompactor failed for conversation #{@conversation.id}: #{e.message}")
    fallback_summary(messages)
  end

  def prompt_messages(messages)
    excerpt = messages.map { |m| "#{m.role}: #{m.content}" }.join("\n")
    [
      { role: "system", content: PromptLoader.load("chat_compaction_prompt") },
      { role: "user", content: [ @conversation.summary_text.presence, excerpt ].compact.join("\n\n") }
    ]
  end

  def fallback_summary(messages)
    "[#{messages.size} earlier messages omitted]"
  end
end

class ChatController < Api::BaseController
  include ActionController::Live

  before_action :prepare_turn

  def create
    set_streaming_headers
    run_chat
  rescue => e
    response.stream.write(sse_chunk(type: :error, text: e.message))
    persist_error_message
  ensure
    response.stream.write("data: [DONE]\n\n")
    response.stream.close
  end

  private

  # Runs as a before_action (not inline in #create) so a bad/missing
  # conversation_id (ActiveRecord::RecordNotFound) or missing message
  # content (ActionController::ParameterMissing) is caught by
  # Api::BaseController's rescue_from chain and rendered as a clean JSON
  # 404/400 BEFORE response.stream is ever touched, instead of being
  # swallowed into an SSE :error frame.
  def prepare_turn
    new_conversation = params[:conversation_id].blank?
    @conversation = find_or_create_conversation
    @conversation.messages.create!(role: "user", content: message_params[:content])
    GenerateConversationTitleJob.perform_later(@conversation.id) if new_conversation
  end

  def find_or_create_conversation
    if params[:conversation_id].present?
      Current.user.conversations.find(params[:conversation_id])
    else
      Current.user.conversations.create!(title: message_params[:content].to_s.strip.truncate(60))
    end
  end

  def message_params
    params.require(:message).permit(:content)
  end

  def set_streaming_headers
    response.headers["Content-Type"] = "text/event-stream"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
  end

  def run_chat
    compact_if_needed!
    full_reply = +""
    orchestrator = ChatOrchestrator.new(provider: ChatProviders.build, mcp_client: build_mcp_client)
    orchestrator.run(messages: messages_with_system_prompt) { |event| handle_event(event, full_reply) }
  end

  def handle_event(event, full_reply)
    full_reply << event[:text] if event[:type] == :content_delta
    persist_assistant_message(full_reply, event) if event[:type] == :done
    response.stream.write(sse_chunk(event))
  end

  # full_reply can legitimately be blank — e.g. every round of a turn was
  # consumed by tool calls with no trailing text (including hitting
  # MAX_TOOL_CALL_ROUNDS), or the model just returned an empty completion.
  # Message#content requires presence, so this substitutes a fallback rather
  # than letting Message.create! raise: an unhandled exception here is
  # caught by ChatController#create's top-level rescue, which emits an SSE
  # :error frame and closes the stream WITHOUT ever sending a real :done
  # payload — silently leaving the conversation's last turn unrecorded.
  def persist_assistant_message(full_reply, event)
    content = full_reply.presence || "(No text reply for this turn.)"
    @conversation.messages.create!(role: "assistant", content: content, task_changes: event[:task_changes])
    @conversation.update_column(:last_prompt_tokens, event[:prompt_tokens]) if event[:prompt_tokens]
  end

  # A mid-stream exception (provider error, MCP failure) means run_chat's
  # handle_event never reached :done, so persist_assistant_message above
  # never ran — without this, the turn's already-persisted user message
  # (from prepare_turn) would be left with no reply at all.
  def persist_error_message
    @conversation.messages.create!(role: "assistant", content: "Sorry, something went wrong generating a reply.")
  rescue StandardError => e
    Rails.logger.warn("ChatController failed to persist error message for conversation #{@conversation&.id}: #{e.message}")
  end

  def build_mcp_client
    McpClient.new(base_url: "#{request.base_url}/mcp", bearer_token: mcp_authorization_header)
  end

  def mcp_authorization_header
    request.headers["Authorization"].presence || "Bearer #{McpDelegationToken.generate(Current.user)}"
  end

  # Reconstructed server-side from persisted history on every request —
  # never trusts a client-resent transcript. summary_text/
  # compacted_through_message_id (see ConversationCompactor) let old turns
  # be replaced by a condensed summary in what's SENT to the model, without
  # touching what's persisted.
  def messages_with_system_prompt
    [ { role: "system", content: PromptLoader.load("chat_system_prompt") } ] +
      summary_message +
      recent_messages.map { |m| { role: m.role, content: m.content } }
  end

  # Reuses the trailing messages ConversationCompactor#call! already loaded
  # when it ran this turn, instead of re-querying the exact same rows.
  def recent_messages
    @kept_after_compaction || @conversation.messages.after(@conversation.compacted_through_message_id)
  end

  def summary_message
    return [] if @conversation.summary_text.blank?

    [ { role: "system", content: "Earlier conversation summary: #{@conversation.summary_text}" } ]
  end

  def compact_if_needed!
    return unless ConversationCompactor.needed?(@conversation, context_window: context_window)

    # Compaction makes its own LLM call before the turn's real reply starts
    # streaming — flush a signal now so the client can show it's not just a
    # slow first token, since nothing else is written to the stream during it.
    response.stream.write(sse_chunk(type: :compacting))
    @kept_after_compaction = ConversationCompactor.new(conversation: @conversation).call!
  end

  # Reflects whether ConversationCompactor actually condensed anything, not
  # just whether it was asked to try — it can no-op when there aren't yet
  # enough messages past the last compaction to be worth summarizing.
  def compacted?
    @kept_after_compaction.present?
  end

  def context_window
    Rails.application.config.x.ollama_context_window
  end

  def sse_chunk(event)
    payload =
      case event[:type]
      when :content_delta then { choices: [ { delta: { content: event[:text] } } ] }
      when :done then done_payload(event)
      when :error then { error: { message: event[:text] } }
      when :compacting then { compacting: true }
      end
    "data: #{payload.to_json}\n\n"
  end

  def done_payload(event)
    {
      choices: [ { delta: {}, finish_reason: event[:finish_reason] } ],
      task_changes: event[:task_changes],
      conversation_id: @conversation.id,
      compacted: compacted?,
      usage: event[:prompt_tokens] && {
        prompt_tokens: event[:prompt_tokens], completion_tokens: event[:completion_tokens], context_window: context_window
      }
    }
  end
end

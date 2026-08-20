module ChatProviders
  # Provider-agnostic contract for talking to an LLM backend. Concrete
  # providers (Ollama today, potentially Anthropic or others later) each
  # translate their own wire format into the same three normalized events,
  # so ChatOrchestrator and ChatController never need to know which
  # provider is actually in use — see config/initializers/chat_provider.rb
  # and ChatProviders.build.
  #
  # A future Anthropic provider would additionally need to: map `messages`
  # to the Messages API shape (system prompt is a separate top-level param,
  # not a role: "system" message; tool results are role: "user" content
  # blocks, not role: "tool"), parse Anthropic's SSE event types
  # (content_block_delta's text_delta/input_json_delta) into the same three
  # events below, and map `parameters:` to `input_schema:` when building
  # its tools payload.
  class Base
    # @param messages [Array<Hash>] the app's own normalized shape — role:,
    #   content:, and optionally tool_calls:/tool_call_id: — never a
    #   provider's raw wire format.
    # @param tools [Array<Hash>] { name:, description:, parameters: <JSON Schema Hash> }
    # @yield [Hash] one of:
    #   { type: :content_delta, text: String }
    #   { type: :tool_call, id:, name:, arguments: Hash } — yielded only once
    #     a tool call's arguments are fully assembled and parsed; providers
    #     own their own fragment-accumulation logic.
    #   { type: :done, finish_reason: String }
    def stream_chat(messages:, tools:)
      raise NotImplementedError, "#{self.class} must implement #stream_chat"
    end
  end
end

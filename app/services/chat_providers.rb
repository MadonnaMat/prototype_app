# Selects the ChatProviders::Base implementation to use, based on
# config/initializers/chat_provider.rb (itself driven by LLM_PROVIDER).
# Adding a new provider later means a new `when` branch here plus a new
# file under chat_providers/ — ChatController and ChatOrchestrator never
# need to change.
module ChatProviders
  def self.build
    config = Rails.application.config.x
    case config.chat_provider
    when "ollama" then Ollama.new(base_url: config.ollama_url, model: config.ollama_model)
    else raise "Unknown LLM_PROVIDER: #{config.chat_provider.inspect}"
    end
  end

  # Convenience for callers that just want a single non-streaming block of
  # text back (title generation, conversation summarization) rather than
  # the full tool-calling loop — buffers a provider's :content_delta events
  # into one string and discards everything else. `tools: []` since none
  # of these internal calls should ever attempt a tool call.
  def self.complete(messages:)
    buffer = +""
    build.stream_chat(messages: messages, tools: []) do |event|
      buffer << event[:text] if event[:type] == :content_delta
    end
    buffer
  end
end

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
end

# Selects the ChatProviders::Base implementation to use, based on
# config/initializers/chat_provider.rb (itself driven by LLM_PROVIDER).
# Adding a new provider later means a new `when` branch here plus a new
# file under chat_providers/ — ChatController and ChatOrchestrator never
# need to change.
module ChatProviders
  def self.build
    case Rails.application.config.x.chat_provider
    when "ollama"
      Ollama.new(base_url: Rails.application.config.x.ollama_url, model: Rails.application.config.x.ollama_model)
    else
      raise "Unknown LLM_PROVIDER: #{Rails.application.config.x.chat_provider.inspect}"
    end
  end
end

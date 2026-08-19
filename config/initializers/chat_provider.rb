# Which LLM backend the /chat/completions endpoint talks to (see
# app/services/chat_providers.rb) and how to reach it. Swapping providers
# later (e.g. Anthropic) means adding a new `when` branch there — this file
# only needs a new env var value, not a code change.
Rails.application.config.x.chat_provider = ENV.fetch("LLM_PROVIDER", "ollama")
Rails.application.config.x.ollama_url = ENV.fetch("OLLAMA_URL", "http://localhost:11434")
Rails.application.config.x.ollama_model = ENV.fetch("OLLAMA_MODEL", "qwen2.5")

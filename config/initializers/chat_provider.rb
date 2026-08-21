# Which LLM backend the /chat/completions endpoint talks to (see
# app/services/chat_providers.rb) and how to reach it. Swapping providers
# later (e.g. Anthropic) means adding a new `when` branch there — this file
# only needs a new env var value, not a code change.
Rails.application.config.x.chat_provider = ENV.fetch("LLM_PROVIDER", "ollama")
Rails.application.config.x.ollama_url = ENV.fetch("OLLAMA_URL", "http://localhost:11434")
Rails.application.config.x.ollama_model = ENV.fetch("OLLAMA_MODEL", "qwen3.5:9b")

# Purely a declared value for the app's own context-usage percentage math (see
# ConversationCompactor, ConversationSerialization) — Ollama's OpenAI-compatible
# endpoint has no per-request way to set the context window, so this must be
# kept in sync manually with whatever the deployed model is actually
# configured with (a custom Modelfile's `PARAMETER num_ctx`, or Ollama's
# server-level OLLAMA_CONTEXT_LENGTH).
Rails.application.config.x.ollama_context_window = ENV.fetch("OLLAMA_CONTEXT_WINDOW", 4096).to_i

# Scriptable ChatProviders::Base double for tests that shouldn't hit a real
# Ollama server. Configured with one array of events per stream_chat call,
# so a multi-round tool-calling test can script what "the model" does each
# round it's asked to continue.
class FakeChatProvider < ChatProviders::Base
  def initialize(turns)
    @turns = turns.dup
  end

  def stream_chat(messages:, tools:)
    events = @turns.shift or raise "FakeChatProvider ran out of scripted turns"
    events.each { |event| yield event }
  end
end

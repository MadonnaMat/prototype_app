module ChatProviders
  # Talks to Ollama's OpenAI-compatible endpoint (POST /v1/chat/completions,
  # stream: true) and normalizes its SSE chunks into ChatProviders::Base's
  # three events. `connection:` is injectable so tests can swap in
  # Faraday's built-in :test adapter instead of hitting a real server.
  class Ollama < Base
    def initialize(base_url:, model:, connection: nil)
      @model = model
      @connection = connection || Faraday.new(url: base_url)
    end

    def stream_chat(messages:, tools:, &emit)
      buffer = +""
      tool_calls = Hash.new { |h, k| h[k] = { id: nil, name: nil, arguments: +"" } }

      @connection.post("/v1/chat/completions") do |req|
        req.headers["Content-Type"] = "application/json"
        req.body = request_body(messages, tools)
        req.options.on_data = proc do |chunk, _bytes|
          buffer << chunk
          while (boundary = buffer.index("\n\n"))
            event = buffer.slice!(0..boundary + 1)
            handle_event(event, tool_calls, &emit)
          end
        end
      end
    end

    private

    def request_body(messages, tools)
      body = { model: @model, messages: messages, stream: true }
      body[:tools] = tools.map { |tool| to_openai_tool(tool) } unless tools.empty?
      body.to_json
    end

    def to_openai_tool(tool)
      { type: "function", function: { name: tool[:name], description: tool[:description], parameters: tool[:parameters] } }
    end

    def handle_event(event, tool_calls, &emit)
      event.each_line do |line|
        data = line.strip.delete_prefix("data:").strip
        next if data.empty?
        return if data == "[DONE]"

        choice = JSON.parse(data).dig("choices", 0)
        next unless choice

        emit_choice(choice, tool_calls, &emit)
      end
    end

    def emit_choice(choice, tool_calls, &emit)
      delta = choice["delta"] || {}
      emit.call({ type: :content_delta, text: delta["content"] }) if delta["content"]
      accumulate_tool_calls(delta["tool_calls"], tool_calls)

      finish_reason = choice["finish_reason"]
      return unless finish_reason

      if finish_reason == "tool_calls"
        tool_calls.each_value { |call| emit.call(finished_tool_call(call)) }
      end
      emit.call({ type: :done, finish_reason: finish_reason })
    end

    def accumulate_tool_calls(deltas, tool_calls)
      Array(deltas).each do |delta|
        call = tool_calls[delta["index"]]
        call[:id] ||= delta["id"]
        call[:name] ||= delta.dig("function", "name")
        call[:arguments] << delta.dig("function", "arguments").to_s
      end
    end

    def finished_tool_call(call)
      { type: :tool_call, id: call[:id], name: call[:name], arguments: JSON.parse(call[:arguments]) }
    end
  end
end

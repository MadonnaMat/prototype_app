module ChatProviders
  # Talks to Ollama's OpenAI-compatible endpoint (POST /v1/chat/completions,
  # stream: true) and normalizes its SSE chunks into ChatProviders::Base's
  # three events. `connection:` is injectable so tests can swap in
  # Faraday's built-in :test adapter instead of hitting a real server.
  class Ollama < Base
    # Generation can legitimately run long for a local model working
    # through several tool-calling rounds, so this is generous — it's a
    # backstop against a truly wedged connection, not a normal-latency
    # bound. open_timeout stays tight since it's a local server.
    REQUEST_TIMEOUT = 300

    def initialize(base_url:, model:, connection: nil)
      @model = model
      @connection = connection || Faraday.new(url: base_url) do |faraday|
        faraday.options.open_timeout = 5
        faraday.options.timeout = REQUEST_TIMEOUT
      end
    end

    def stream_chat(messages:, tools:, &emit)
      buffer = +""
      tool_calls = Hash.new { |h, k| h[k] = { id: nil, name: nil, arguments: +"" } }
      state = { finish_reason: nil, usage: nil }

      response = @connection.post("/v1/chat/completions") do |req|
        req.headers["Content-Type"] = "application/json"
        req.body = request_body(messages, tools)
        req.options.on_data = proc { |chunk, _bytes| handle_chunk(chunk, buffer, tool_calls, state, &emit) }
      end

      check_response!(response)
      emit.call(done_event(state))
    end

    private

    def handle_chunk(chunk, buffer, tool_calls, state, &emit)
      buffer << chunk
      while (boundary = buffer.index("\n\n"))
        handle_event(buffer.slice!(0..boundary + 1), tool_calls, state, &emit)
      end
    end

    # A non-2xx response has no SSE body for on_data to parse, so without
    # this check a failed request (bad model name, Ollama down mid-request,
    # etc.) would silently yield nothing instead of surfacing the failure.
    def check_response!(response)
      raise "Ollama request failed: #{response.status} #{response.body}" unless response.success?
    end

    def request_body(messages, tools)
      body = { model: @model, messages: messages, stream: true, stream_options: { include_usage: true } }
      body[:tools] = tools.map { |tool| to_openai_tool(tool) } unless tools.empty?
      body.to_json
    end

    def to_openai_tool(tool)
      { type: "function", function: { name: tool[:name], description: tool[:description], parameters: tool[:parameters] } }
    end

    # finish_reason arrives on an earlier chunk than the trailing
    # usage-only chunk (stream_options: include_usage), which per the
    # OpenAI streaming protocol has an EMPTY choices array — so :done can't
    # be emitted the moment finish_reason shows up, it has to wait until
    # the whole response has been read.
    def handle_event(event, tool_calls, state, &emit)
      event.each_line do |line|
        data = line.strip.delete_prefix("data:").strip
        next if data.empty?
        return if data == "[DONE]"

        payload = JSON.parse(data)
        record_usage(payload["usage"], state)
        choice = payload.dig("choices", 0)
        emit_choice(choice, tool_calls, state, &emit) if choice
      end
    end

    def record_usage(usage, state)
      return unless usage

      state[:usage] = { prompt_tokens: usage["prompt_tokens"], completion_tokens: usage["completion_tokens"] }
    end

    def emit_choice(choice, tool_calls, state, &emit)
      delta = choice["delta"] || {}
      emit.call({ type: :content_delta, text: delta["content"] }) if delta["content"]
      accumulate_tool_calls(delta["tool_calls"], tool_calls)

      finish_reason = choice["finish_reason"]
      return unless finish_reason

      tool_calls.each_value { |call| emit.call(finished_tool_call(call)) } if finish_reason == "tool_calls"
      state[:finish_reason] = finish_reason
    end

    # Omits prompt_tokens/completion_tokens entirely (rather than nil) when
    # the provider never reported usage, so callers can tell "no usage
    # reported" apart from "usage reported as zero".
    def done_event(state)
      event = { type: :done, finish_reason: state[:finish_reason] }
      event.merge!(state[:usage]) if state[:usage]
      event
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

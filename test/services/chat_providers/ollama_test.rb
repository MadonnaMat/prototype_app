require "test_helper"

module ChatProviders
  class OllamaTest < ActiveSupport::TestCase
    test "plain streamed text yields content_delta events then done" do
      sse = <<~SSE
        data: {"choices":[{"delta":{"role":"assistant","content":"Hi"},"finish_reason":null}]}

        data: {"choices":[{"delta":{"content":" there"},"finish_reason":null}]}

        data: {"choices":[{"delta":{},"finish_reason":"stop"}]}

        data: [DONE]

      SSE
      provider = build_provider(stream_chunks(sse))

      events = collect_events(provider)

      assert_equal [
        { type: :content_delta, text: "Hi" },
        { type: :content_delta, text: " there" },
        { type: :done, finish_reason: "stop" }
      ], events
    end

    test "tool-call arguments fragmented across raw chunks are accumulated and parsed" do
      sse = tool_call_sse(id: "call_1", name: "create_task", arguments: { title: "Buy milk" })

      # Split the raw SSE text at an arbitrary byte offset that lands
      # mid-event (not on any "\n\n" boundary) — proves the buffering
      # handles a chunk arriving mid-event, on top of the arguments JSON
      # itself already being split across separate tool_call deltas.
      split_at = sse.length / 3
      provider = build_provider(stream_chunks(sse[0...split_at], sse[split_at..]))

      events = collect_events(provider)

      assert_equal({ type: :tool_call, id: "call_1", name: "create_task", arguments: { "title" => "Buy milk" } },
        events.find { |e| e[:type] == :tool_call })
      assert_equal({ type: :done, finish_reason: "tool_calls" }, events.last)
    end

    test "a trailing usage-only chunk (empty choices) is folded into the done event" do
      sse = <<~SSE
        data: {"choices":[{"delta":{"role":"assistant","content":"Hi"},"finish_reason":null}]}

        data: {"choices":[{"delta":{},"finish_reason":"stop"}]}

        data: {"choices":[],"usage":{"prompt_tokens":42,"completion_tokens":7}}

        data: [DONE]

      SSE
      provider = build_provider(stream_chunks(sse))

      events = collect_events(provider)

      assert_equal [
        { type: :content_delta, text: "Hi" },
        { type: :done, finish_reason: "stop", prompt_tokens: 42, completion_tokens: 7 }
      ], events
    end

    test "a non-2xx response raises instead of silently yielding nothing" do
      provider = build_provider(proc { |_env| [ 500, {}, "internal error" ] })

      error = assert_raises(RuntimeError) { collect_events(provider) }
      assert_match(/500/, error.message)
    end

    private

    def build_provider(stub_proc)
      connection = Faraday.new do |builder|
        builder.adapter :test do |stub|
          stub.post("/v1/chat/completions", &stub_proc)
        end
      end
      Ollama.new(base_url: "http://example.test", model: "qwen2.5", connection: connection)
    end

    # Simulates the real adapter feeding on_data raw bytes as they arrive
    # off the wire — each argument here is one such chunk, deliberately not
    # required to align with SSE event ("\n\n") or even line boundaries.
    def stream_chunks(*raw_chunks)
      proc do |env|
        raw_chunks.each { |chunk| env.request.on_data&.call(chunk, chunk.bytesize) }
        [ 200, {}, "" ]
      end
    end

    # Builds an SSE body for a single tool call whose `arguments` JSON
    # string arrives split across two separate delta events, the way a
    # real streaming response fragments it — via .to_json rather than
    # hand-escaped literals, so the fragment boundary can't accidentally
    # land somewhere that produces invalid JSON.
    def tool_call_sse(id:, name:, arguments:)
      arguments_json = arguments.to_json
      midpoint = arguments_json.length / 2

      chunks = [
        { choices: [ { delta: { tool_calls: [ { index: 0, id: id, function: { name: name, arguments: "" } } ] }, finish_reason: nil } ] },
        { choices: [ { delta: { tool_calls: [ { index: 0, function: { arguments: arguments_json[0...midpoint] } } ] }, finish_reason: nil } ] },
        { choices: [ { delta: { tool_calls: [ { index: 0, function: { arguments: arguments_json[midpoint..] } } ] }, finish_reason: nil } ] },
        { choices: [ { delta: {}, finish_reason: "tool_calls" } ] }
      ]
      chunks.map { |payload| "data: #{payload.to_json}\n\n" }.join + "data: [DONE]\n\n"
    end

    def collect_events(provider)
      events = []
      provider.stream_chat(messages: [ { role: "user", content: "hi" } ], tools: []) { |event| events << event }
      events
    end
  end
end

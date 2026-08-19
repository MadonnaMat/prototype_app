# Streaming chat completions over Ollama + the app's own MCP server (see
# config/routes.rb, app/services/chat_orchestrator.rb). Inherits
# Api::BaseController (even though it's routed outside /api) purely to reuse
# its Bearer/cookie auth and CSRF handling — the JSON envelope helpers
# (render_resource etc.) don't apply here since the response is a stream.
class ChatController < Api::BaseController
  include ActionController::Live

  def create
    response.headers["Content-Type"] = "text/event-stream"
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"

    provider = ChatProviders.build
    # tools: [] until McpClient/ChatOrchestrator are wired in — plain
    # conversational round-trip only, for now.
    provider.stream_chat(messages: parsed_request_messages, tools: []) do |event|
      response.stream.write(sse_chunk(event))
    end
    response.stream.write("data: [DONE]\n\n")
  rescue => e
    response.stream.write(sse_chunk(type: :error, text: e.message))
  ensure
    response.stream.close
  end

  private

  # ActionController::Live runs the action body in its own thread, so the
  # inherited rescue_from isn't reliable for errors raised after streaming
  # has started (headers are already flushed) — hence the explicit
  # rescue/ensure above instead of relying on it.
  def parsed_request_messages
    params.require(:messages).map { |message| message.permit(:role, :content).to_h.symbolize_keys }
  end

  def sse_chunk(event)
    payload =
      case event[:type]
      when :content_delta then { choices: [ { delta: { content: event[:text] } } ] }
      when :tool_call
        { choices: [ { delta: { tool_calls: [ { id: event[:id], function: { name: event[:name], arguments: event[:arguments].to_json } } ] } } ] }
      when :done then { choices: [ { delta: {}, finish_reason: event[:finish_reason] } ] }
      when :error then { error: { message: event[:text] } }
      end
    "data: #{payload.to_json}\n\n"
  end
end

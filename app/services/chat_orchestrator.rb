# Runs the tool-calling loop between a ChatProviders::Base and an
# McpClient: streams the provider's plain text straight through, and when
# the model requests a tool call, executes it via MCP, feeds the result
# back into the conversation, and asks the provider to continue — until it
# answers with plain text (no more tool calls) or MAX_TOOL_CALL_ROUNDS is
# hit.
class ChatOrchestrator
  MAX_TOOL_CALL_ROUNDS = 5

  def initialize(provider:, mcp_client:)
    @provider = provider
    @mcp_client = mcp_client
  end

  def run(messages:, &emit)
    tools = @mcp_client.tool_specs
    conversation = messages.dup

    MAX_TOOL_CALL_ROUNDS.times do
      tool_calls, finish_reason = stream_one_turn(conversation, tools, &emit)

      if tool_calls.empty?
        emit.call({ type: :done, finish_reason: finish_reason })
        return
      end

      conversation << assistant_tool_call_message(tool_calls)
      tool_calls.each { |call| conversation << tool_result_message(call) }
    end

    emit.call({ type: :done, finish_reason: "tool_call_limit_reached" })
  end

  private

  def stream_one_turn(conversation, tools, &emit)
    tool_calls = []
    finish_reason = nil

    @provider.stream_chat(messages: conversation, tools: tools) do |event|
      case event[:type]
      when :content_delta then emit.call(event)
      when :tool_call then tool_calls << event
      when :done then finish_reason = event[:finish_reason]
      end
    end

    [ tool_calls, finish_reason ]
  end

  def assistant_tool_call_message(tool_calls)
    {
      role: "assistant",
      content: nil,
      tool_calls: tool_calls.map { |call| { id: call[:id], type: "function", function: { name: call[:name], arguments: call[:arguments].to_json } } }
    }
  end

  def tool_result_message(call)
    result = @mcp_client.call_tool(name: call[:name], arguments: call[:arguments])
    { role: "tool", tool_call_id: call[:id], content: result[:text] }
  end
end

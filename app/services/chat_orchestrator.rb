# Runs the tool-calling loop between a ChatProviders::Base and an
# McpClient: streams the provider's plain text straight through, and when
# the model requests a tool call, executes it via MCP, feeds the result
# back into the conversation, and asks the provider to continue — until it
# answers with plain text (no more tool calls) or MAX_TOOL_CALL_ROUNDS is
# hit. Also tracks which tasks were touched along the way (see
# TASK_ACTIONS) and reports them as `task_changes` on the final :done
# event, so a caller can act on what happened without parsing the model's
# prose reply.
class ChatOrchestrator
  MAX_TOOL_CALL_ROUNDS = 5

  TASK_ACTIONS = {
    "create_task" => :created,
    "update_task" => :updated,
    "complete_task" => :completed,
    "delete_task" => :deleted,
    "list_tasks" => :accessed
  }.freeze

  def initialize(provider:, mcp_client:)
    @provider = provider
    @mcp_client = mcp_client
  end

  def run(messages:, &emit)
    @task_changes = []
    tools = @mcp_client.tool_specs
    conversation = messages.dup

    MAX_TOOL_CALL_ROUNDS.times do
      tool_calls, finish_reason = stream_one_turn(conversation, tools, &emit)

      if tool_calls.empty?
        emit.call({ type: :done, finish_reason: finish_reason, task_changes: @task_changes })
        return
      end

      conversation << assistant_tool_call_message(tool_calls)
      tool_calls.each { |call| conversation << tool_result_message(call) }
    end

    emit.call({ type: :done, finish_reason: "tool_call_limit_reached", task_changes: @task_changes })
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
    record_task_changes(call[:name], result[:data])
    { role: "tool", tool_call_id: call[:id], content: result[:text] }
  end

  # `data` is nil for error responses (they're a plain message string, not
  # JSON — see McpClient#call_tool), so this naturally no-ops on failure.
  def record_task_changes(tool_name, data)
    action = TASK_ACTIONS[tool_name]
    return unless action && data

    if tool_name == "list_tasks"
      Array(data[:tasks]).each { |task| @task_changes << { action: action, id: task[:id], title: task[:title] } }
    elsif data[:id]
      @task_changes << { action: action, id: data[:id], title: data[:title] }
    end
  end
end

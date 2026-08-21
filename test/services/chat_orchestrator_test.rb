require "test_helper"

class ChatOrchestratorTest < ActiveSupport::TestCase
  test "streams content and a scripted tool call actually creates a task via real MCP" do
    provider = FakeChatProvider.new([
      [
        { type: :tool_call, id: "call_1", name: "create_task", arguments: { title: "From orchestrator test" } },
        { type: :done, finish_reason: "tool_calls" }
      ],
      [
        { type: :content_delta, text: "Done!" },
        { type: :done, finish_reason: "stop" }
      ]
    ])
    base_url = "#{Capybara::Server.new(Rails.application, host: "localhost").boot.base_url}/mcp"
    mcp_client = McpClient.new(base_url: base_url, bearer_token: "Bearer test-token-one")
    orchestrator = ChatOrchestrator.new(provider: provider, mcp_client: mcp_client)

    events = []
    assert_difference("Task.count", 1) do
      orchestrator.run(messages: [ { role: "user", content: "create a task" } ]) { |event| events << event }
    end

    assert_includes events, { type: :content_delta, text: "Done!" }
    created_task = Task.order(:id).last
    assert_equal "From orchestrator test", created_task.title
    assert_equal(
      { type: :done, finish_reason: "stop", task_changes: [ { action: :created, id: created_task.id, title: "From orchestrator test" } ] },
      events.last,
    )
  end

  test "forwards prompt/completion token counts from a scripted done event unchanged" do
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Hi" }, { type: :done, finish_reason: "stop", prompt_tokens: 42, completion_tokens: 7 } ]
    ])
    orchestrator = ChatOrchestrator.new(provider: provider, mcp_client: LoopingMcpClientDouble.new)

    events = []
    orchestrator.run(messages: []) { |event| events << event }

    assert_equal(
      { type: :done, finish_reason: "stop", task_changes: [], prompt_tokens: 42, completion_tokens: 7 },
      events.last,
    )
  end

  test "stops after MAX_TOOL_CALL_ROUNDS instead of looping forever" do
    keeps_calling_tools = Array.new(ChatOrchestrator::MAX_TOOL_CALL_ROUNDS) do
      [ { type: :tool_call, id: "call_x", name: "list_tasks", arguments: {} }, { type: :done, finish_reason: "tool_calls" } ]
    end
    provider = FakeChatProvider.new(keeps_calling_tools)
    mcp_client = LoopingMcpClientDouble.new
    orchestrator = ChatOrchestrator.new(provider: provider, mcp_client: mcp_client)

    events = []
    orchestrator.run(messages: []) { |event| events << event }

    assert_equal ChatOrchestrator::MAX_TOOL_CALL_ROUNDS, mcp_client.call_count
    assert_equal :done, events.last[:type]
    assert_equal "tool_call_limit_reached", events.last[:finish_reason]
  end

  # Avoids MAX_TOOL_CALL_ROUNDS real MCP round trips (and Minitest::Mock's
  # awkward keyword-argument matching) for a test that's purely about the
  # orchestrator's own loop-termination logic, not MCP behavior.
  class LoopingMcpClientDouble
    attr_reader :call_count

    def initialize
      @call_count = 0
    end

    def tool_specs
      []
    end

    def call_tool(name:, arguments:)
      @call_count += 1
      { text: "[]", error: false, data: nil }
    end
  end
end

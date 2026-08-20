require "test_helper"

# McpClient talks to /mcp over a real HTTP loopback (MCP::Client::HTTP is
# Faraday-based, not Rack::Test), so this needs an actual listening server
# rather than the in-process dispatch ActionDispatch::IntegrationTest uses
# — Capybara::Server (already a test dependency for system tests) boots one
# on an ephemeral port, cached/reused across tests the same way system
# tests already rely on it.
class McpClientTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
    @base_url = "#{Capybara::Server.new(Rails.application, host: "localhost").boot.base_url}/mcp"
  end

  test "tool_specs lists all five task tools with their parameter schemas" do
    client = McpClient.new(base_url: @base_url, bearer_token: "Bearer test-token-one")

    specs = client.tool_specs

    assert_equal %w[list_tasks create_task update_task complete_task delete_task].sort, specs.map { |s| s[:name] }.sort
    create_spec = specs.find { |s| s[:name] == "create_task" }
    # input_schema comes straight from MCP::Client::Tool (the gem's own
    # JSON parsing), so — unlike call_tool's `data:` — it isn't symbolized.
    assert_equal "object", create_spec[:parameters]["type"]
    assert_includes create_spec[:parameters]["properties"].keys, "title"
  end

  test "call_tool create_task actually creates a task scoped to the token's user" do
    client = McpClient.new(base_url: @base_url, bearer_token: "Bearer test-token-one")

    result = nil
    assert_difference("Task.count", 1) do
      result = client.call_tool(name: "create_task", arguments: { title: "From McpClient test" })
    end

    assert_not result[:error]
    assert_equal "From McpClient test", result[:data][:title]
    assert_equal @user, Task.find(result[:data][:id]).user
  end

  test "call_tool with an unknown task id returns an error result" do
    client = McpClient.new(base_url: @base_url, bearer_token: "Bearer test-token-one")

    result = client.call_tool(name: "complete_task", arguments: { id: 999_999 })

    assert result[:error]
    assert_match(/not found/i, result[:text])
  end

  test "an invalid bearer token is unauthorized" do
    client = McpClient.new(base_url: @base_url, bearer_token: "Bearer bogus-token")

    result = client.call_tool(name: "list_tasks", arguments: {})

    assert result[:error]
    assert_match(/unauthorized/i, result[:text])
  end
end

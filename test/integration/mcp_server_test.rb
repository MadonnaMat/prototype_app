require "test_helper"

class McpServerTest < ActionDispatch::IntegrationTest
  setup do
    @task = tasks(:one)
    host! "localhost" # Rails' integration test default Host is www.example.com,
    # which the transport's loopback-only DNS-rebinding
    # allowlist rejects — must explicitly use localhost.
    @session_id = initialize_mcp_session
  end

  test "tools/list exposes all five task tools" do
    post_mcp("tools/list")
    names = JSON.parse(response.body)["result"]["tools"].map { |t| t["name"] }
    assert_equal %w[list_tasks create_task update_task complete_task delete_task].sort, names.sort
  end

  test "list_tasks returns existing tasks" do
    result = call_tool("list_tasks", {})
    assert_not result["isError"]
    ids = JSON.parse(result["content"].first["text"]).map { |t| t["id"] }
    assert_includes ids, @task.id
  end

  test "create_task creates a task" do
    assert_difference("Task.count") do
      result = call_tool("create_task", { title: "New task" })
      assert_not result["isError"]
    end
  end

  test "create_task with missing title returns isError" do
    result = call_tool("create_task", {})
    assert result["isError"]
  end

  test "update_task updates an existing task" do
    result = call_tool("update_task", { id: @task.id, title: "Updated" })
    assert_not result["isError"]
    assert_equal "Updated", JSON.parse(result["content"].first["text"])["title"]
  end

  test "update_task with unknown id returns isError" do
    result = call_tool("update_task", { id: -1, title: "x" })
    assert result["isError"]
  end

  test "complete_task marks a task done" do
    result = call_tool("complete_task", { id: @task.id })
    assert_not result["isError"]
    assert_equal true, JSON.parse(result["content"].first["text"])["done"]
  end

  test "complete_task with unknown id returns isError" do
    result = call_tool("complete_task", { id: -1 })
    assert result["isError"]
  end

  test "delete_task removes a task" do
    assert_difference("Task.count", -1) do
      result = call_tool("delete_task", { id: @task.id })
      assert_not result["isError"]
    end
  end

  test "delete_task with unknown id returns isError" do
    result = call_tool("delete_task", { id: -1 })
    assert result["isError"]
  end

  private

  def initialize_mcp_session
    post "/mcp",
      params: {
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } }
      }.to_json,
      headers: { "Content-Type" => "application/json", "Accept" => "application/json, text/event-stream" }
    assert_response :success
    response.headers["mcp-session-id"]
  end

  def post_mcp(method, params = {})
    post "/mcp",
      params: { jsonrpc: "2.0", id: rand(1000), method: method, params: params }.to_json,
      headers: {
        "Content-Type" => "application/json",
        "Accept" => "application/json, text/event-stream",
        "Mcp-Session-Id" => @session_id
      }
  end

  def call_tool(name, arguments)
    post_mcp("tools/call", { name: name, arguments: arguments })
    JSON.parse(response.body)["result"]
  end
end

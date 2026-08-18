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

  test "resources/list exposes the tasks resource" do
    post_mcp("resources/list")
    result = JSON.parse(response.body)["result"]
    assert_equal [ "tasks://all" ], result["resources"].map { |r| r["uri"] }
  end

  test "resources/templates/list exposes the task template" do
    post_mcp("resources/templates/list")
    result = JSON.parse(response.body)["result"]
    assert_equal [ "task://{id}" ], result["resourceTemplates"].map { |t| t["uriTemplate"] }
  end

  test "list_tasks returns own tasks and everyone's public tasks" do
    result = call_tool("list_tasks", {})
    assert_not result["isError"]
    ids = JSON.parse(result["content"].first["text"])["tasks"].map { |t| t["id"] }
    assert_includes ids, @task.id
    assert_includes ids, tasks(:three).id # someone else's public task
    assert_not_includes ids, tasks(:four).id # someone else's private task
  end

  test "list_tasks paginates with limit and cursor" do
    3.times { |i| Task.create!(title: "Paginated #{i}", user: users(:one)) }

    first_page = JSON.parse(call_tool("list_tasks", { limit: 2 })["content"].first["text"])
    assert_equal 2, first_page["tasks"].size
    assert first_page["next_cursor"]

    second_page = JSON.parse(
      call_tool("list_tasks", { limit: 2, cursor: first_page["next_cursor"] })["content"].first["text"]
    )
    first_ids = first_page["tasks"].map { |t| t["id"] }
    second_ids = second_page["tasks"].map { |t| t["id"] }
    assert_empty first_ids & second_ids
  end

  test "create_task creates a task owned by the current user" do
    assert_difference("Task.count") do
      result = call_tool("create_task", { title: "New task" })
      assert_not result["isError"]
    end
    assert_equal users(:one), Task.last.user
  end

  test "create_task with missing title returns isError" do
    result = call_tool("create_task", {})
    assert result["isError"]
    assert_match(/title/i, result["content"].first["text"])
  end

  test "create_task with an unrecognized argument returns isError instead of crashing" do
    result = call_tool("create_task", { title: "New task", bogus: 1 })
    assert result["isError"]
  end

  test "update_task updates an existing task" do
    result = call_tool("update_task", { id: @task.id, title: "Updated" })
    assert_not result["isError"]
    assert_equal "Updated", JSON.parse(result["content"].first["text"])["title"]
  end

  test "update_task with unknown id returns isError" do
    result = call_tool("update_task", { id: 999_999, title: "x" })
    assert result["isError"]
  end

  test "update_task on someone else's private task returns isError (not found)" do
    result = call_tool("update_task", { id: tasks(:four).id, title: "Hijacked" })
    assert result["isError"]
    assert_match(/not found/i, result["content"].first["text"])
  end

  test "update_task on someone else's public task returns isError (forbidden)" do
    result = call_tool("update_task", { id: tasks(:three).id, title: "Hijacked" })
    assert result["isError"]
    assert_match(/forbidden/i, result["content"].first["text"])
    assert_not_equal "Hijacked", tasks(:three).reload.title
  end

  test "update_task with an unrecognized argument returns isError" do
    result = call_tool("update_task", { id: @task.id, bogus: 1 })
    assert result["isError"]
  end

  test "update_task on a concurrently modified task returns isError instead of a false success" do
    stale_task = Task.find(@task.id)
    Task.where(id: @task.id).update_all("lock_version = lock_version + 1")

    # Stub visible_to to hand back the pre-update in-memory record (bypassing
    # a fresh DB read) so the subsequent task.update below is racing against
    # a lock_version it no longer matches — simulates another request having
    # already applied the concurrent change.
    stale_scope = Object.new
    stale_scope.define_singleton_method(:find_by) { |*| stale_task }

    result = Task.stub(:visible_to, stale_scope) do
      call_tool("update_task", { id: @task.id, title: "Racing update" })
    end

    assert result["isError"]
    assert_not_equal "Racing update", Task.find(@task.id).title
  end

  test "complete_task marks a task done" do
    result = call_tool("complete_task", { id: @task.id })
    assert_not result["isError"]
    assert_equal true, JSON.parse(result["content"].first["text"])["done"]
  end

  test "complete_task with unknown id returns isError" do
    result = call_tool("complete_task", { id: 999_999 })
    assert result["isError"]
  end

  test "complete_task with a non-integer id returns isError" do
    result = call_tool("complete_task", { id: "abc" })
    assert result["isError"]
  end

  test "delete_task removes a task" do
    assert_difference("Task.count", -1) do
      result = call_tool("delete_task", { id: @task.id })
      assert_not result["isError"]
    end
  end

  test "delete_task with unknown id returns isError" do
    result = call_tool("delete_task", { id: 999_999 })
    assert result["isError"]
  end

  test "delete_task on someone else's public task returns isError (forbidden)" do
    assert_no_difference("Task.count") do
      result = call_tool("delete_task", { id: tasks(:three).id })
      assert result["isError"]
      assert_match(/forbidden/i, result["content"].first["text"])
    end
  end

  test "a tool call without a token returns isError Unauthorized" do
    result = call_tool("list_tasks", {}, token: nil)
    assert result["isError"]
    assert_match(/unauthorized/i, result["content"].first["text"])
  end

  test "a tool call with an invalid token returns isError Unauthorized" do
    result = call_tool("list_tasks", {}, token: "bogus")
    assert result["isError"]
    assert_match(/unauthorized/i, result["content"].first["text"])
  end

  test "resources/read on tasks://all returns own tasks and everyone's public tasks" do
    body = read_resource("tasks://all")
    tasks = JSON.parse(body["result"]["contents"].first["text"])["tasks"]
    ids = tasks.map { |t| t["id"] }
    assert_includes ids, @task.id
    assert_includes ids, tasks(:three).id
    assert_not_includes ids, tasks(:four).id
  end

  test "resources/read on tasks://all without a token returns a JSON-RPC error" do
    body = read_resource("tasks://all", token: nil)
    assert_nil body["result"]
    assert_equal(-32001, body["error"]["code"])
  end

  test "resources/read on task://{id} returns a single task" do
    body = read_resource("task://#{@task.id}")
    task = JSON.parse(body["result"]["contents"].first["text"])
    assert_equal @task.id, task["id"]
  end

  test "resources/read on task://{id} for someone else's public task succeeds" do
    body = read_resource("task://#{tasks(:three).id}")
    assert body["result"]
  end

  test "resources/read on task://{id} for an unknown id returns a JSON-RPC error" do
    body = read_resource("task://999999")
    assert_nil body["result"]
    assert body["error"]
  end

  test "resources/read on task://{id} for a non-numeric id returns a JSON-RPC error" do
    body = read_resource("task://not-a-number")
    assert_nil body["result"]
    assert body["error"]
  end

  test "resources/read on task://{id} without a token returns a JSON-RPC error" do
    body = read_resource("task://#{@task.id}", token: nil)
    assert_nil body["result"]
    assert_equal(-32001, body["error"]["code"])
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

  def post_mcp(method, params = {}, token: "test-token-one")
    headers = {
      "Content-Type" => "application/json",
      "Accept" => "application/json, text/event-stream",
      "Mcp-Session-Id" => @session_id
    }
    headers["Authorization"] = "Bearer #{token}" if token

    post "/mcp",
      params: { jsonrpc: "2.0", id: rand(1000), method: method, params: params }.to_json,
      headers: headers
  end

  def call_tool(name, arguments, token: "test-token-one")
    post_mcp("tools/call", { name: name, arguments: arguments }, token: token)
    JSON.parse(response.body)["result"]
  end

  def read_resource(uri, token: "test-token-one")
    post_mcp("resources/read", { uri: uri }, token: token)
    JSON.parse(response.body)
  end
end

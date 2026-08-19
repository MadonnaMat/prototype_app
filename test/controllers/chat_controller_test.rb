require "test_helper"

# ChatController's /mcp loopback call needs a real listening server (see
# McpClientTest), and since ChatProviders.build is stubbed via Object#stub
# — a temporary method redefinition on the live constant, visible to any
# thread in this same process — driving the *outer* request through the
# same real Capybara server (rather than ActionDispatch::IntegrationTest's
# in-process dispatch) still picks up the stub correctly.
class ChatControllerTest < ActiveSupport::TestCase
  class RaisingChatProvider < ChatProviders::Base
    def stream_chat(messages:, tools:)
      yield({ type: :content_delta, text: "partial" })
      raise "boom"
    end
  end

  setup do
    @base_url = Capybara::Server.new(Rails.application, host: "localhost").boot.base_url
  end

  test "happy path streams content and terminates with DONE" do
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Hi" }, { type: :content_delta, text: " there" }, { type: :done, finish_reason: "stop" } ]
    ])

    body = nil
    ChatProviders.stub(:build, -> { provider }) do
      body = post_chat([ { role: "user", content: "hi" } ])
    end

    assert_includes body, %(data: {"choices":[{"delta":{"content":"Hi"}}]})
    assert_includes body, %(data: {"choices":[{"delta":{"content":" there"}}]})
    assert_includes body, %("finish_reason":"stop")
    assert_includes body, "\"task_changes\":[]"
    assert_includes body, "data: [DONE]"
  end

  test "a scripted tool call actually creates a task via real MCP, reported in task_changes" do
    provider = FakeChatProvider.new([
      [ { type: :tool_call, id: "call_1", name: "create_task", arguments: { title: "From controller test" } },
        { type: :done, finish_reason: "tool_calls" } ],
      [ { type: :content_delta, text: "Done!" }, { type: :done, finish_reason: "stop" } ]
    ])

    body = nil
    ChatProviders.stub(:build, -> { provider }) do
      assert_difference("Task.count", 1) { body = post_chat([ { role: "user", content: "create a task" } ]) }
    end

    created = Task.order(:id).last
    assert_equal "From controller test", created.title
    assert_equal users(:one), created.user
    assert_includes body, %("task_changes":[{"action":"created","id":#{created.id},"title":"From controller test"}])
  end

  test "an invalid bearer token returns a clean 401 before any stream opens" do
    body = post_chat([ { role: "user", content: "hi" } ], token: "bogus-token")

    assert_equal({ "meta" => { "success" => false, "error" => "Unauthenticated" } }, JSON.parse(body))
  end

  test "a mid-stream provider error still yields already-streamed content, then a graceful error and DONE" do
    body = nil
    ChatProviders.stub(:build, -> { RaisingChatProvider.new }) do
      body = post_chat([ { role: "user", content: "hi" } ])
    end

    assert_includes body, %(data: {"choices":[{"delta":{"content":"partial"}}]})
    assert_includes body, %(data: {"error":{"message":"boom"}})
    assert_includes body, "data: [DONE]"
  end

  private

  def post_chat(messages, token: "test-token-one")
    uri = URI("#{@base_url}/chat/completions")
    Net::HTTP.start(uri.host, uri.port) do |http|
      request = Net::HTTP::Post.new(uri, "Content-Type" => "application/json")
      request["Authorization"] = "Bearer #{token}" if token
      request.body = { messages: messages }.to_json
      http.request(request).body
    end
  end
end

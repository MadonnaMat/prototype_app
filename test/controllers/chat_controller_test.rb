require "test_helper"

# ChatController's /mcp loopback call needs a real listening server (see
# McpClientTest), and since ChatProviders.build is stubbed via Object#stub
# — a temporary method redefinition on the live constant, visible to any
# thread in this same process — driving the *outer* request through the
# same real Capybara server (rather than ActionDispatch::IntegrationTest's
# in-process dispatch) still picks up the stub correctly.
class ChatControllerTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

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

    response = nil
    ChatProviders.stub(:build, -> { provider }) do
      response = post_chat(conversation_id: conversations(:one).id, content: "hi")
    end

    body = response.body
    assert_includes body, %(data: {"choices":[{"delta":{"content":"Hi"}}]})
    assert_includes body, %(data: {"choices":[{"delta":{"content":" there"}}]})
    assert_includes body, %("finish_reason":"stop")
    assert_includes body, "\"task_changes\":[]"
    assert_includes body, %("conversation_id":#{conversations(:one).id})
    assert_includes body, "data: [DONE]"
  end

  test "when compaction is needed, emits a :compacting chunk before the real reply" do
    conversations(:one).update!(last_prompt_tokens: 3500) # > 4096 * 0.8 default threshold
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Hi" }, { type: :done, finish_reason: "stop" } ]
    ])

    response = nil
    ChatProviders.stub(:build, -> { provider }) do
      response = post_chat(conversation_id: conversations(:one).id, content: "hi")
    end

    body = response.body
    assert_includes body, %(data: {"compacting":true})
    assert_operator body.index('"compacting":true'), :<, body.index('"content":"Hi"')
  end

  test "does not emit a :compacting chunk when the last turn's usage is well under the threshold" do
    conversations(:one).update!(last_prompt_tokens: 100)
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Hi" }, { type: :done, finish_reason: "stop" } ]
    ])

    response = nil
    ChatProviders.stub(:build, -> { provider }) do
      response = post_chat(conversation_id: conversations(:one).id, content: "hi")
    end

    assert_not_includes response.body, "compacting"
  end

  test "a first message with no conversation_id creates a conversation and persists both messages" do
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Hi there" }, { type: :done, finish_reason: "stop" } ]
    ])

    response = nil
    ChatProviders.stub(:build, -> { provider }) do
      assert_difference("Conversation.count", 1) do
        assert_difference("Message.count", 2) do
          response = post_chat(conversation_id: nil, content: "Plan my week")
        end
      end
    end

    conversation = Conversation.order(:id).last
    assert_equal users(:one), conversation.user
    assert_equal "Plan my week", conversation.title
    assert_equal "user", conversation.messages.order(:created_at).first.role
    assert_equal "assistant", conversation.messages.order(:created_at).last.role
    assert_equal "Hi there", conversation.messages.order(:created_at).last.content
    assert_includes response.body, %("conversation_id":#{conversation.id})
  end

  test "a follow-up message with an existing conversation_id does not create a new conversation" do
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Sure" }, { type: :done, finish_reason: "stop" } ]
    ])

    ChatProviders.stub(:build, -> { provider }) do
      assert_no_difference("Conversation.count") do
        assert_difference("Message.count", 2) do
          post_chat(conversation_id: conversations(:one).id, content: "and after that?")
        end
      end
    end
  end

  test "title job is enqueued only for a brand-new conversation, not a follow-up" do
    provider = FakeChatProvider.new([
      [ { type: :done, finish_reason: "stop" } ],
      [ { type: :done, finish_reason: "stop" } ]
    ])

    ChatProviders.stub(:build, -> { provider }) do
      assert_enqueued_with(job: GenerateConversationTitleJob) do
        post_chat(conversation_id: nil, content: "new chat")
      end

      new_conversation_id = Conversation.order(:id).last.id
      assert_no_enqueued_jobs(only: GenerateConversationTitleJob) do
        post_chat(conversation_id: new_conversation_id, content: "follow up")
      end
    end
  end

  test "a scripted tool call actually creates a task via real MCP, reported in task_changes and persisted" do
    provider = FakeChatProvider.new([
      [ { type: :tool_call, id: "call_1", name: "create_task", arguments: { title: "From controller test" } },
        { type: :done, finish_reason: "tool_calls" } ],
      [ { type: :content_delta, text: "Done!" }, { type: :done, finish_reason: "stop" } ]
    ])

    response = nil
    ChatProviders.stub(:build, -> { provider }) do
      assert_difference("Task.count", 1) do
        response = post_chat(conversation_id: conversations(:one).id, content: "create a task")
      end
    end

    created = Task.order(:id).last
    assert_equal "From controller test", created.title
    assert_equal users(:one), created.user
    assert_includes response.body, %("task_changes":[{"action":"created","id":#{created.id},"title":"From controller test"}])

    persisted = conversations(:one).messages.order(:created_at).last
    assert_equal "assistant", persisted.role
    assert_equal [ { "action" => "created", "id" => created.id, "title" => "From controller test" } ], persisted.task_changes
  end

  test "a turn with no text reply (e.g. tool-only rounds) still persists a message and a real DONE, not an error" do
    provider = FakeChatProvider.new([
      [ { type: :done, finish_reason: "tool_call_limit_reached" } ]
    ])

    response = nil
    ChatProviders.stub(:build, -> { provider }) do
      assert_difference("Message.count", 2) do
        response = post_chat(conversation_id: conversations(:one).id, content: "hi")
      end
    end

    body = response.body
    assert_not_includes body, "\"error\""
    assert_includes body, %("finish_reason":"tool_call_limit_reached")
    assert_includes body, "data: [DONE]"

    persisted = conversations(:one).messages.order(:created_at).last
    assert_equal "assistant", persisted.role
    assert persisted.content.present?
  end

  test "an invalid bearer token returns a clean 401 before any stream opens" do
    response = post_chat(conversation_id: nil, content: "hi", token: "bogus-token")

    assert_equal({ "meta" => { "success" => false, "error" => "Unauthenticated" } }, JSON.parse(response.body))
  end

  test "a missing message param returns a clean 400 as JSON before any SSE stream opens" do
    response = post_chat_raw({ conversation_id: nil })

    assert_match(%r{\Aapplication/json}, response["Content-Type"])
    meta = JSON.parse(response.body)["meta"]
    assert_equal false, meta["success"]
  end

  test "an unknown conversation_id returns a clean 404 as JSON before any SSE stream opens" do
    response = post_chat_raw({ conversation_id: -1, message: { content: "hi" } })

    assert_match(%r{\Aapplication/json}, response["Content-Type"])
    meta = JSON.parse(response.body)["meta"]
    assert_equal false, meta["success"]
  end

  test "another user's conversation_id returns a clean 404 as JSON" do
    response = post_chat_raw({ conversation_id: conversations(:two).id, message: { content: "hi" } })

    assert_match(%r{\Aapplication/json}, response["Content-Type"])
    assert_equal false, JSON.parse(response.body)["meta"]["success"]
  end

  test "a mid-stream provider error still yields already-streamed content, then a graceful error and DONE" do
    response = nil
    ChatProviders.stub(:build, -> { RaisingChatProvider.new }) do
      response = post_chat(conversation_id: conversations(:one).id, content: "hi")
    end

    body = response.body
    assert_includes body, %(data: {"choices":[{"delta":{"content":"partial"}}]})
    assert_includes body, %(data: {"error":{"message":"boom"}})
    assert_includes body, "data: [DONE]"
  end

  private

  def post_chat(conversation_id:, content:, token: "test-token-one")
    post_chat_raw({ conversation_id: conversation_id, message: { content: content } }, token: token)
  end

  def post_chat_raw(payload, token: "test-token-one")
    uri = URI("#{@base_url}/chat/completions")
    Net::HTTP.start(uri.host, uri.port) do |http|
      request = Net::HTTP::Post.new(uri, "Content-Type" => "application/json")
      request["Authorization"] = "Bearer #{token}" if token
      request.body = payload.to_json
      http.request(request)
    end
  end
end

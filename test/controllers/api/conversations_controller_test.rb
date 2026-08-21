require "test_helper"

module Api
  class ConversationsControllerTest < ActionDispatch::IntegrationTest
    setup do
      @conversation = conversations(:one)
      @auth_headers = { "Authorization" => "Bearer test-token-one" }
      @other_auth_headers = { "Authorization" => "Bearer test-token-two" }
    end

    test "unexpected error returns 500 as json" do
      ConversationSerialization.stub(:conversation_list_json, ->(*) { raise StandardError, "boom" }) do
        get api_conversations_url, headers: @auth_headers, as: :json
      end
      assert_response :internal_server_error
      assert_equal "application/json; charset=utf-8", response.content_type
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_equal "boom", meta["error"]
      assert meta.key?("backtrace")
    end

    test "index without a token returns unauthenticated as json" do
      get api_conversations_url, as: :json
      assert_response :unauthorized
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_equal "Unauthenticated", meta["error"]
    end

    test "index returns only the current user's conversations" do
      get api_conversations_url, headers: @auth_headers, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      ids = body["conversations"].map { |c| c["id"] }
      assert_equal [ conversations(:one).id ], ids
      assert_equal true, body["meta"]["success"]
    end

    test "show returns a conversation with its full message history" do
      get api_conversation_url(@conversation), headers: @auth_headers, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal @conversation.id, body["conversation"]["id"]
      assert_equal 2, body["conversation"]["messages"].size
      assert_equal true, body["meta"]["success"]
    end

    test "show on another user's conversation returns not found" do
      get api_conversation_url(conversations(:two)), headers: @auth_headers, as: :json
      assert_response :not_found
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
    end

    test "show with missing id returns not found as json" do
      get api_conversation_url(id: -1), headers: @auth_headers, as: :json
      assert_response :not_found
      assert_equal "application/json; charset=utf-8", response.content_type
    end

    test "update renames the conversation and marks the title as manually set" do
      patch api_conversation_url(@conversation), params: { conversation: { title: "New title" } },
        headers: @auth_headers, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal "New title", body["conversation"]["title"]
      assert_equal true, body["conversation"]["title_generated"]
      assert_equal true, body["meta"]["success"]
      @conversation.reload
      assert_equal "New title", @conversation.title
      assert @conversation.title_generated
    end

    test "update with a blank title returns a validation error" do
      patch api_conversation_url(@conversation), params: { conversation: { title: "" } },
        headers: @auth_headers, as: :json
      assert_response :unprocessable_entity
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_includes meta["errors"]["title"], "can't be blank"
    end

    test "update on another user's conversation returns not found" do
      patch api_conversation_url(conversations(:two)), params: { conversation: { title: "Hijacked" } },
        headers: @auth_headers, as: :json
      assert_response :not_found
      assert_not_equal "Hijacked", conversations(:two).reload.title
    end

    test "destroy removes the conversation and cascades its messages" do
      assert_difference("Message.count", -2) do
        assert_difference("Conversation.count", -1) do
          delete api_conversation_url(@conversation), headers: @auth_headers, as: :json
        end
      end
      assert_response :success
      assert_equal true, JSON.parse(response.body)["meta"]["success"]
    end

    test "destroy on another user's conversation returns not found" do
      assert_no_difference("Conversation.count") do
        delete api_conversation_url(conversations(:two)), headers: @auth_headers, as: :json
      end
      assert_response :not_found
    end
  end
end

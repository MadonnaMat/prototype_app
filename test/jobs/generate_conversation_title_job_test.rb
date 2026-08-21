require "test_helper"

class GenerateConversationTitleJobTest < ActiveSupport::TestCase
  setup do
    @conversation = conversations(:one)
    @conversation.update!(title: "Help me plan a trip", title_generated: false)
  end

  test "replaces the placeholder title with the provider's generated title" do
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Trip " }, { type: :content_delta, text: "Planning" }, { type: :done, finish_reason: "stop" } ]
    ])

    ChatProviders.stub(:build, provider) do
      GenerateConversationTitleJob.perform_now(@conversation.id)
    end

    @conversation.reload
    assert_equal "Trip Planning", @conversation.title
    assert @conversation.title_generated
  end

  test "strips wrapping quotes and truncates a too-long generated title" do
    long_title = ('"' + ("word " * 30).strip + '"')
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: long_title }, { type: :done, finish_reason: "stop" } ]
    ])

    ChatProviders.stub(:build, provider) do
      GenerateConversationTitleJob.perform_now(@conversation.id)
    end

    @conversation.reload
    assert @conversation.title.length <= 60
    assert_not @conversation.title.start_with?('"')
  end

  test "falls back to keeping the placeholder and still marks title_generated on provider failure" do
    raising_provider = Class.new(ChatProviders::Base) do
      def stream_chat(messages:, tools:)
        raise "boom"
      end
    end.new

    ChatProviders.stub(:build, raising_provider) do
      GenerateConversationTitleJob.perform_now(@conversation.id)
    end

    @conversation.reload
    assert_equal "Help me plan a trip", @conversation.title
    assert @conversation.title_generated
  end

  test "does nothing if the conversation was already manually renamed" do
    @conversation.update!(title: "Manually renamed", title_generated: true)
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Should not be used" }, { type: :done, finish_reason: "stop" } ]
    ])

    ChatProviders.stub(:build, provider) do
      GenerateConversationTitleJob.perform_now(@conversation.id)
    end

    @conversation.reload
    assert_equal "Manually renamed", @conversation.title
  end

  test "does nothing if the conversation no longer exists" do
    assert_nothing_raised do
      GenerateConversationTitleJob.perform_now(-1)
    end
  end
end

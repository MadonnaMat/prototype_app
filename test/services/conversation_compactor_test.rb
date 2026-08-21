require "test_helper"

class ConversationCompactorTest < ActiveSupport::TestCase
  setup do
    @conversation = conversations(:one)
  end

  test "does nothing when there aren't more than KEEP_RECENT pending messages" do
    compactor = ConversationCompactor.new(conversation: @conversation)

    result = ChatProviders.stub(:build, ->(*) { raise "should not be called" }) do
      compactor.call!
    end

    assert_nil result
    assert_nil @conversation.reload.summary_text
    assert_nil @conversation.compacted_through_message_id
  end

  test "summarizes the oldest messages, keeping only KEEP_RECENT out of the compaction" do
    extra_needed = ConversationCompactor::KEEP_RECENT + 1 - @conversation.messages.count
    extra_needed.times { |i| @conversation.messages.create!(role: "user", content: "filler #{i}") }
    provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Summary of early turns." }, { type: :done, finish_reason: "stop" } ]
    ])

    result = ChatProviders.stub(:build, provider) do
      ConversationCompactor.new(conversation: @conversation).call!
    end

    @conversation.reload
    assert_equal "Summary of early turns.", @conversation.summary_text
    remaining = @conversation.messages.after(@conversation.compacted_through_message_id)
    assert_equal ConversationCompactor::KEEP_RECENT, remaining.count
    assert_equal remaining.to_a, result
  end

  test "falls back to a placeholder summary when the provider fails" do
    extra_needed = ConversationCompactor::KEEP_RECENT + 1 - @conversation.messages.count
    extra_needed.times { |i| @conversation.messages.create!(role: "user", content: "filler #{i}") }
    raising_provider = Class.new(ChatProviders::Base) do
      def stream_chat(messages:, tools:)
        raise "boom"
      end
    end.new

    ChatProviders.stub(:build, raising_provider) do
      ConversationCompactor.new(conversation: @conversation).call!
    end

    @conversation.reload
    assert_match(/earlier messages omitted/, @conversation.summary_text)
    assert @conversation.compacted_through_message_id.present?
  end

  test "compounds: a second run folds the prior summary in and advances the pointer" do
    extra_needed = ConversationCompactor::KEEP_RECENT + 1 - @conversation.messages.count
    extra_needed.times { |i| @conversation.messages.create!(role: "user", content: "filler #{i}") }
    first_provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "First summary." }, { type: :done, finish_reason: "stop" } ]
    ])
    ChatProviders.stub(:build, first_provider) do
      ConversationCompactor.new(conversation: @conversation).call!
    end
    first_pointer = @conversation.reload.compacted_through_message_id

    ConversationCompactor::KEEP_RECENT.times { |i| @conversation.messages.create!(role: "user", content: "more #{i}") }
    seen_prior_summary = nil
    second_provider = FakeChatProvider.new([
      [ { type: :content_delta, text: "Combined summary." }, { type: :done, finish_reason: "stop" } ]
    ])
    second_provider.define_singleton_method(:stream_chat) do |messages:, tools:, &blk|
      seen_prior_summary = messages.any? { |m| m[:content].to_s.include?("First summary.") }
      blk.call({ type: :content_delta, text: "Combined summary." })
      blk.call({ type: :done, finish_reason: "stop" })
    end

    ChatProviders.stub(:build, second_provider) do
      ConversationCompactor.new(conversation: @conversation).call!
    end

    @conversation.reload
    assert seen_prior_summary
    assert_equal "Combined summary.", @conversation.summary_text
    assert_not_equal first_pointer, @conversation.compacted_through_message_id
  end
end

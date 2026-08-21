module Api
  class ConversationsController < Api::BaseController
    before_action :set_conversation, only: %i[show update destroy]

    # @summary List the current user's conversations
    # @response Conversations(200) [Hash{ conversations: Array<Hash{ id: !Integer, title: !String, title_generated: !Boolean, updated_at: !String }>, meta: Hash{ success: Boolean } }]
    def index
      conversations = Current.user.conversations.recent_first
      render_resource(conversations: conversations.map { |c| ConversationSerialization.conversation_list_json(c) })
    end

    # @summary Get a conversation with its full message history
    # @parameter id(path) [!Integer] The conversation ID
    # @response Conversation found(200) [Hash{ conversation: Hash{ id: !Integer, title: !String, title_generated: !Boolean, updated_at: !String, last_prompt_tokens: Integer, context_window: !Integer, messages: !Array<Hash{ id: !Integer, role: !String, content: !String, task_changes: !Array<Hash{ action: !String, id: !Integer, title: !String }>, created_at: !String }> }, meta: Hash{ success: Boolean } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def show
      render_resource(conversation: ConversationSerialization.conversation_show_json(@conversation))
    end

    # @summary Rename a conversation
    # @parameter id(path) [!Integer] The conversation ID
    # @request_body Conversation attributes [!Hash{ title: !String }]
    # @request_body_example Rename [JSON {"title": "Trip planning"}]
    # @response Updated(200) [Hash{ conversation: Hash{ id: !Integer, title: !String, title_generated: !Boolean, updated_at: !String }, meta: Hash{ success: Boolean } }]
    # @response Validation error(422) [Hash{ meta: Hash{ success: Boolean, errors: Hash{ title: Array<String> } } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def update
      if @conversation.update(rename_params)
        render_resource(conversation: ConversationSerialization.conversation_list_json(@conversation))
      else
        render_validation_error(@conversation.errors)
      end
    end

    # @summary Delete a conversation
    # @parameter id(path) [!Integer] The conversation ID
    # @response Deleted(200) [Hash{ meta: Hash{ success: Boolean } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def destroy
      @conversation.destroy
      render_resource
    end

    private

    def set_conversation
      @conversation = Current.user.conversations.find(params[:id])
    end

    def conversation_params
      params.require(:conversation).permit(:title)
    end

    # title_generated only belongs on a param-driven update when the request
    # actually touches :title — this endpoint permits nothing else today,
    # but merging the flag in unconditionally would silently mis-stamp any
    # future non-title field (e.g. archiving) as a title rename.
    def rename_params
      attrs = conversation_params
      attrs.key?(:title) ? attrs.merge(title_generated: true) : attrs
    end
  end
end

class PagesController < ApplicationController
  def home
    @task_app_props = task_app_props
  end

  private

  # No data is seeded for a request with no session cookie — the client's
  # own auth-gated fetch (via RequireAuth) handles that case by redirecting
  # to /login. This also means an unauthenticated page load never bakes any
  # task or conversation data (someone else's private records included)
  # into the response HTML, which a scope-less `Task.all`/`Task.find_by`
  # here previously did regardless of who (if anyone) was looking.
  def task_app_props
    return {} unless ssr_current_user

    if params[:id]
      task_props
    elsif params[:conversation_id]
      conversation_props
    elsif request.path == "/"
      tasks_index_props
    elsif request.path == "/assistant"
      conversations_index_props
    else
      {}
    end
  end

  def task_props
    task = Task.visible_to(ssr_current_user).find_by(id: params[:id])
    task ? { initialTask: TaskSerialization.task_json(task) } : {}
  end

  def tasks_index_props
    tasks = Task.visible_to(ssr_current_user).includes(:user)
    { initialTasks: tasks.map { |task| TaskSerialization.task_json(task) } }
  end

  def conversations_index_props
    { initialConversations: ssr_current_user.conversations.recent_first.map { |c| ConversationSerialization.conversation_list_json(c) } }
  end

  # Seeds both the active conversation's full detail AND the sidebar list —
  # otherwise the sidebar would still flash empty-then-populated on first
  # paint even though the conversation body itself was seeded.
  def conversation_props
    conversation = ssr_current_user.conversations.find_by(id: params[:conversation_id])
    return conversations_index_props unless conversation

    conversations_index_props.merge(initialConversation: ConversationSerialization.conversation_show_json(conversation))
  end

  def ssr_current_user
    @ssr_current_user ||= find_session_by_cookie&.user
  end
end

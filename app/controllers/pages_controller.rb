class PagesController < ApplicationController
  def home
    @task_app_props = task_app_props
  end

  private

  # No tasks are seeded for a request with no session cookie — the client's
  # own auth-gated fetch (via RequireAuth) handles that case by redirecting
  # to /login. This also means an unauthenticated page load never bakes any
  # task data (someone else's private tasks included) into the response
  # HTML, which a scope-less `Task.all`/`Task.find_by` here previously did
  # regardless of who (if anyone) was looking.
  def task_app_props
    return {} unless ssr_current_user

    if params[:id]
      task = Task.visible_to(ssr_current_user).find_by(id: params[:id])
      task ? { initialTask: TaskSerialization.task_json(task) } : {}
    elsif request.path == "/"
      tasks = Task.visible_to(ssr_current_user).includes(:user)
      { initialTasks: tasks.map { |task| TaskSerialization.task_json(task) } }
    else
      {}
    end
  end

  def ssr_current_user
    @ssr_current_user ||= find_session_by_cookie&.user
  end
end

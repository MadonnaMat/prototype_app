module TaskSerialization
  module_function

  def task_json(task)
    task.as_json(only: Task::API_ATTRIBUTES).merge(owner_username: task.user.username)
  end

  def text_response(text, error: false)
    MCP::Tool::Response.new([ { type: "text", text: text } ], error: error)
  end

  def not_found_response(id)
    text_response("Task #{id} not found", error: true)
  end

  def list_response(tasks, next_cursor: nil)
    payload = { tasks: tasks.map { |task| task_json(task) } }
    payload[:next_cursor] = next_cursor if next_cursor
    text_response(payload.to_json)
  end

  def deleted_response(id)
    text_response({ id: id, deleted: true }.to_json)
  end

  # Looks up a task the current user can see (own tasks + everyone's public
  # tasks) or short-circuits with not_found_response, so each tool doesn't
  # repeat the same find-then-guard pattern (mirrors Api::TasksController#set_task).
  def find_task(id)
    task = Task.visible_to(Current.user).includes(:user).find_by(id: id)
    return not_found_response(id) unless task

    yield task
  end

  # Shared by update/complete/delete: like find_task, but the task must
  # also be owned by the current user — a visible-but-not-owned task
  # (someone else's public task) is a distinct "Forbidden" rather than
  # not-found, since its existence is already known from list_tasks.
  def find_owned_task(id)
    find_task(id) do |task|
      next text_response("Forbidden", error: true) unless task.owned_by?(Current.user)

      yield task
    end
  end

  # Shared by create/update/complete: each calls task.save or task.update
  # first and passes along the resulting boolean as `success`, rather than
  # inferring it from task.errors.empty? (which is also true for a task
  # that was never saved/updated at all, e.g. a future before_save callback
  # that throws :abort without adding to errors).
  def persist_response(task, success)
    if success
      text_response(task_json(task).to_json)
    else
      text_response(task.errors.full_messages.join(", "), error: true)
    end
  end

  # Wraps a tool's `.call` body so any unhandled exception becomes a normal
  # MCP error response instead of propagating out of the mounted transport,
  # which (unlike Api::BaseController) has no rescue_from safety net of its
  # own. Mirrors Api::BaseController#render_error: message always included,
  # backtrace only in Rails.env.local? so nothing leaks in production.
  def rescue_errors
    return text_response("Unauthorized", error: true) unless Current.user

    yield
  rescue ActiveRecord::StaleObjectError
    text_response("Task was modified or deleted by another request; please retry.", error: true)
  rescue StandardError => e
    text = e.message
    text += "\n#{e.backtrace.join("\n")}" if Rails.env.local?
    text_response(text, error: true)
  end
end

class PagesController < ApplicationController
  TASK_ATTRS = %i[id title description done created_at updated_at].freeze

  def home
    @task_app_props = task_app_props
  end

  private

  def task_app_props
    if (task_id = edit_task_id_from_path)
      task = Task.find_by(id: task_id)
      task ? { initialTask: task.as_json(only: TASK_ATTRS) } : {}
    elsif request.path == "/"
      { initialTasks: Task.all.as_json(only: TASK_ATTRS) }
    else
      {}
    end
  end

  def edit_task_id_from_path
    request.path[%r{\A/tasks/(\d+)/edit\z}, 1]
  end
end

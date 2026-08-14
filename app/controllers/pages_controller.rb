class PagesController < ApplicationController
  def home
    @task_app_props = task_app_props
  end

  private

  def task_app_props
    if params[:id]
      task = Task.find_by(id: params[:id])
      task ? { initialTask: task.as_json(only: Task::API_ATTRIBUTES) } : {}
    elsif request.path == "/"
      { initialTasks: Task.all.as_json(only: Task::API_ATTRIBUTES) }
    else
      {}
    end
  end
end

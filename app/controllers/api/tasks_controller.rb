module Api
  class TasksController < Api::BaseController
    before_action :set_task, only: %i[show update destroy]
    before_action :require_ownership!, only: %i[update destroy]

    # @summary List tasks visible to the current user
    # @response Tasks(200) [Hash{ tasks: Array<Hash{ id: !Integer, title: !String, description: String, done: !Boolean, is_public: !Boolean, owner_username: !String, created_at: !String, updated_at: !String }>, meta: Hash{ success: Boolean } }]
    def index
      tasks = Task.visible_to(Current.user).includes(:user)
      render_resource(tasks: tasks.map { |task| TaskSerialization.task_json(task) })
    end

    # @summary Get a task by ID
    # @parameter id(path) [!Integer] The task ID
    # @response Task found(200) [Hash{ task: Hash{ id: !Integer, title: !String, description: String, done: !Boolean, is_public: !Boolean, owner_username: !String, created_at: !String, updated_at: !String }, meta: Hash{ success: Boolean } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def show
      render_resource(task: TaskSerialization.task_json(@task))
    end

    # @summary Create a task
    # @request_body Task attributes [!Hash{ title: !String, description: String, done: Boolean, is_public: Boolean }]
    # @request_body_example Basic task [JSON {"title": "Write docs", "description": "Add OpenAPI docs", "done": false, "is_public": false}]
    # @response Created(201) [Hash{ task: Hash{ id: !Integer, title: !String, description: String, done: !Boolean, is_public: !Boolean, owner_username: !String, created_at: !String, updated_at: !String }, meta: Hash{ success: Boolean } }]
    # @response Validation error(422) [Hash{ meta: Hash{ success: Boolean, errors: Hash{ title: Array<String> } } }]
    # @response Missing task param(400) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def create
      @task = Current.user.tasks.new(task_params)

      if @task.save
        render_resource(task: TaskSerialization.task_json(@task), status: :created)
      else
        render_validation_error(@task.errors)
      end
    end

    # @summary Update a task
    # @parameter id(path) [!Integer] The task ID
    # @request_body Task attributes [Hash{ title: String, description: String, done: Boolean, is_public: Boolean }]
    # @response Updated(200) [Hash{ task: Hash{ id: !Integer, title: !String, description: String, done: !Boolean, is_public: !Boolean, owner_username: !String, created_at: !String, updated_at: !String }, meta: Hash{ success: Boolean } }]
    # @response Validation error(422) [Hash{ meta: Hash{ success: Boolean, errors: Hash{ title: Array<String> } } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    # @response Not owned(403) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def update
      if @task.update(task_params)
        render_resource(task: TaskSerialization.task_json(@task))
      else
        render_validation_error(@task.errors)
      end
    end

    # @summary Delete a task
    # @parameter id(path) [!Integer] The task ID
    # @response Deleted(200) [Hash{ meta: Hash{ success: Boolean } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    # @response Not owned(403) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def destroy
      @task.destroy
      render_resource
    end

    private

    def set_task
      @task = Task.visible_to(Current.user).includes(:user).find(params[:id])
    end

    # Visible-but-not-owned (someone else's public task) is a 403, since the
    # task's existence is already known from the index; a task that's
    # neither owned nor public never gets here at all — set_task raises
    # RecordNotFound for it, so its existence isn't leaked as a 403.
    def require_ownership!
      render_error("Forbidden", status: :forbidden) unless @task.owned_by?(Current.user)
    end

    def task_params
      params.require(:task).permit(:title, :description, :done, :is_public)
    end
  end
end

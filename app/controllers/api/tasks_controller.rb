module Api
  class TasksController < Api::BaseController
    before_action :set_task, only: %i[show update destroy]

    # @summary List all tasks
    # @response Tasks(200) [Hash{ tasks: Array<Hash{ id: Integer, title: String, description: String, done: Boolean, created_at: String, updated_at: String }>, meta: Hash{ success: Boolean } }]
    def index
      render_resource(tasks: Task.all)
    end

    # @summary Get a task by ID
    # @parameter id(path) [!Integer] The task ID
    # @response Task found(200) [Hash{ task: Hash{ id: Integer, title: String, description: String, done: Boolean, created_at: String, updated_at: String }, meta: Hash{ success: Boolean } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def show
      render_resource(task: @task)
    end

    # @summary Create a task
    # @request_body Task attributes [!Hash{ title: !String, description: String, done: Boolean }]
    # @request_body_example Basic task [JSON {"title": "Write docs", "description": "Add OpenAPI docs", "done": false}]
    # @response Created(201) [Hash{ task: Hash{ id: Integer, title: String, description: String, done: Boolean, created_at: String, updated_at: String }, meta: Hash{ success: Boolean } }]
    # @response Validation error(422) [Hash{ meta: Hash{ success: Boolean, errors: Hash{ title: Array<String> } } }]
    # @response Missing task param(400) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def create
      @task = Task.new(task_params)

      if @task.save
        render_resource(task: @task, status: :created)
      else
        render_validation_error(@task.errors)
      end
    end

    # @summary Update a task
    # @parameter id(path) [!Integer] The task ID
    # @request_body Task attributes [Hash{ title: String, description: String, done: Boolean }]
    # @response Updated(200) [Hash{ task: Hash{ id: Integer, title: String, description: String, done: Boolean, created_at: String, updated_at: String }, meta: Hash{ success: Boolean } }]
    # @response Validation error(422) [Hash{ meta: Hash{ success: Boolean, errors: Hash{ title: Array<String> } } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def update
      if @task.update(task_params)
        render_resource(task: @task)
      else
        render_validation_error(@task.errors)
      end
    end

    # @summary Delete a task
    # @parameter id(path) [!Integer] The task ID
    # @response Deleted(200) [Hash{ meta: Hash{ success: Boolean } }]
    # @response Not found(404) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def destroy
      @task.destroy
      render_resource
    end

    private

    def set_task
      @task = Task.find(params[:id])
    end

    def task_params
      params.require(:task).permit(:title, :description, :done)
    end
  end
end

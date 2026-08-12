require "test_helper"

module Api
  class TasksControllerTest < ActionDispatch::IntegrationTest
    setup do
      @task = tasks(:one)
    end

    test "unexpected error returns 500 as json" do
      Task.stub(:all, -> { raise StandardError, "boom" }) do
        get api_tasks_url, as: :json
      end
      assert_response :internal_server_error
      assert_equal "application/json; charset=utf-8", response.content_type
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_equal "boom", meta["error"]
      assert meta.key?("backtrace")
    end

    test "index returns a list of tasks under meta success" do
      get api_tasks_url, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_kind_of Array, body["tasks"]
      assert_equal true, body["meta"]["success"]
    end

    test "show returns a task under meta success" do
      get api_task_url(@task), as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal @task.id, body["task"]["id"]
      assert_equal true, body["meta"]["success"]
    end

    test "show with missing id returns not found as json" do
      get api_task_url(id: -1), as: :json
      assert_response :not_found
      assert_equal "application/json; charset=utf-8", response.content_type
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_match(/Task/, meta["error"])
    end

    test "update with missing id returns not found as json" do
      patch api_task_url(id: -1), params: { task: { title: "New title" } }, as: :json
      assert_response :not_found
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
    end

    test "destroy with missing id returns not found as json" do
      delete api_task_url(id: -1), as: :json
      assert_response :not_found
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
    end

    test "create without a task param returns bad request as json" do
      post api_tasks_url, params: {}, as: :json
      assert_response :bad_request
      assert_equal "application/json; charset=utf-8", response.content_type
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
    end

    test "create with valid params creates a task" do
      assert_difference("Task.count") do
        post api_tasks_url, params: { task: { title: "New task", description: "Details", done: false } }, as: :json
      end
      assert_response :created
      body = JSON.parse(response.body)
      assert_equal "New task", body["task"]["title"]
      assert_equal true, body["meta"]["success"]
    end

    test "create with invalid params does not create a task" do
      assert_no_difference("Task.count") do
        post api_tasks_url, params: { task: { title: nil } }, as: :json
      end
      assert_response :unprocessable_entity
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_includes meta["errors"]["title"], "can't be blank"
    end

    test "update with valid params updates the task" do
      patch api_task_url(@task), params: { task: { title: "Updated title" } }, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal "Updated title", body["task"]["title"]
      assert_equal true, body["meta"]["success"]
      @task.reload
      assert_equal "Updated title", @task.title
    end

    test "update with invalid params does not update the task" do
      patch api_task_url(@task), params: { task: { title: nil } }, as: :json
      assert_response :unprocessable_entity
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_includes meta["errors"]["title"], "can't be blank"
    end

    test "destroy removes the task" do
      assert_difference("Task.count", -1) do
        delete api_task_url(@task), as: :json
      end
      assert_response :success
      assert_equal true, JSON.parse(response.body)["meta"]["success"]
    end
  end
end

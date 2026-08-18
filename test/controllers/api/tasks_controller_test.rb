require "test_helper"

module Api
  class TasksControllerTest < ActionDispatch::IntegrationTest
    setup do
      @task = tasks(:one)
      @auth_headers = { "Authorization" => "Bearer test-token-one" }
      @other_auth_headers = { "Authorization" => "Bearer test-token-two" }
    end

    test "unexpected error returns 500 as json" do
      Task.stub(:visible_to, -> (*) { raise StandardError, "boom" }) do
        get api_tasks_url, headers: @auth_headers, as: :json
      end
      assert_response :internal_server_error
      assert_equal "application/json; charset=utf-8", response.content_type
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_equal "boom", meta["error"]
      assert meta.key?("backtrace")
    end

    test "index without a token returns unauthenticated as json" do
      get api_tasks_url, as: :json
      assert_response :unauthorized
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_equal "Unauthenticated", meta["error"]
    end

    test "index with an invalid token returns unauthenticated as json" do
      get api_tasks_url, headers: { "Authorization" => "Bearer bogus" }, as: :json
      assert_response :unauthorized
    end

    test "index returns own tasks and everyone's public tasks under meta success" do
      get api_tasks_url, headers: @auth_headers, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      ids = body["tasks"].map { |t| t["id"] }
      assert_includes ids, tasks(:one).id
      assert_includes ids, tasks(:three).id # someone else's public task
      assert_equal true, body["meta"]["success"]
    end

    test "index includes owner_username on each task" do
      get api_tasks_url, headers: @auth_headers, as: :json
      body = JSON.parse(response.body)
      task = body["tasks"].find { |t| t["id"] == tasks(:three).id }
      assert_equal "bob", task["owner_username"]
    end

    test "show returns a task under meta success" do
      get api_task_url(@task), headers: @auth_headers, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal @task.id, body["task"]["id"]
      assert_equal true, body["meta"]["success"]
    end

    test "show on someone else's public task succeeds" do
      get api_task_url(tasks(:three)), headers: @auth_headers, as: :json
      assert_response :success
    end

    test "show on someone else's private task returns not found" do
      get api_task_url(tasks(:one)), headers: @other_auth_headers, as: :json
      assert_response :not_found
    end

    test "show with missing id returns not found as json" do
      get api_task_url(id: -1), headers: @auth_headers, as: :json
      assert_response :not_found
      assert_equal "application/json; charset=utf-8", response.content_type
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_match(/Task/, meta["error"])
    end

    test "update with missing id returns not found as json" do
      patch api_task_url(id: -1), params: { task: { title: "New title" } }, headers: @auth_headers, as: :json
      assert_response :not_found
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
    end

    test "update on someone else's public task returns forbidden" do
      patch api_task_url(tasks(:three)), params: { task: { title: "Hijacked" } }, headers: @auth_headers, as: :json
      assert_response :forbidden
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
      assert_not_equal "Hijacked", tasks(:three).reload.title
    end

    test "destroy on someone else's public task returns forbidden" do
      assert_no_difference("Task.count") do
        delete api_task_url(tasks(:three)), headers: @auth_headers, as: :json
      end
      assert_response :forbidden
    end

    test "destroy with missing id returns not found as json" do
      delete api_task_url(id: -1), headers: @auth_headers, as: :json
      assert_response :not_found
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
    end

    test "create without a task param returns bad request as json" do
      post api_tasks_url, params: {}, headers: @auth_headers, as: :json
      assert_response :bad_request
      assert_equal "application/json; charset=utf-8", response.content_type
      assert_equal false, JSON.parse(response.body)["meta"]["success"]
    end

    test "create with valid params creates a task owned by the current user" do
      assert_difference("Task.count") do
        post api_tasks_url, params: { task: { title: "New task", description: "Details", done: false } },
          headers: @auth_headers, as: :json
      end
      assert_response :created
      body = JSON.parse(response.body)
      assert_equal "New task", body["task"]["title"]
      assert_equal true, body["meta"]["success"]
      assert_equal users(:one), Task.last.user
    end

    test "create with is_public true creates a task visible to other users" do
      post api_tasks_url, params: { task: { title: "Shared", is_public: true } }, headers: @auth_headers, as: :json
      assert_response :created
      assert_equal true, JSON.parse(response.body)["task"]["is_public"]

      get api_tasks_url, headers: @other_auth_headers, as: :json
      ids = JSON.parse(response.body)["tasks"].map { |t| t["id"] }
      assert_includes ids, Task.find_by!(title: "Shared").id
    end

    test "create with invalid params does not create a task" do
      assert_no_difference("Task.count") do
        post api_tasks_url, params: { task: { title: nil } }, headers: @auth_headers, as: :json
      end
      assert_response :unprocessable_entity
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_includes meta["errors"]["title"], "can't be blank"
    end

    test "update with valid params updates the task" do
      patch api_task_url(@task), params: { task: { title: "Updated title" } }, headers: @auth_headers, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal "Updated title", body["task"]["title"]
      assert_equal true, body["meta"]["success"]
      @task.reload
      assert_equal "Updated title", @task.title
    end

    test "update with invalid params does not update the task" do
      patch api_task_url(@task), params: { task: { title: nil } }, headers: @auth_headers, as: :json
      assert_response :unprocessable_entity
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_includes meta["errors"]["title"], "can't be blank"
    end

    test "destroy removes the task" do
      assert_difference("Task.count", -1) do
        delete api_task_url(@task), headers: @auth_headers, as: :json
      end
      assert_response :success
      assert_equal true, JSON.parse(response.body)["meta"]["success"]
    end
  end
end

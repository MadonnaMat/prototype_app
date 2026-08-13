require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "home renders successfully" do
    get root_url
    assert_response :success
  end

  test "home seeds initialTasks with the full task list" do
    get root_url
    assert_response :success
    assert_includes response.body, tasks(:one).title
    assert_includes response.body, tasks(:two).title
  end

  test "catch-all route renders the SPA shell for /tasks/new" do
    get "/tasks/new"
    assert_response :success
  end

  test "catch-all route renders the SPA shell for /tasks/:id/edit and seeds initialTask" do
    get "/tasks/#{tasks(:one).id}/edit"
    assert_response :success
    assert_includes response.body, tasks(:one).title
  end

  test "catch-all route renders successfully for a nonexistent task id without an initialTask prop" do
    get "/tasks/999999/edit"
    assert_response :success
    assert_no_match(/"initialTask"/, response.body)
  end

  test "does not swallow unmatched /api routes into the SPA shell" do
    get "/api/bogus"
    assert_response :not_found
  end

  test "does not swallow the OpenAPI docs route into the SPA shell" do
    get "/docs"
    assert_response :success
  end
end

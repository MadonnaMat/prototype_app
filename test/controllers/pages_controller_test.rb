require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
  end

  def sign_in_as(user)
    session = user.sessions.create!
    ActionDispatch::TestRequest.create.cookie_jar.tap do |cookie_jar|
      cookie_jar.signed[:session_id] = session.id
      cookies["session_id"] = cookie_jar[:session_id]
    end
  end

  test "home renders successfully when signed out" do
    get root_url
    assert_response :success
  end

  test "home does not seed any task data when signed out" do
    get root_url
    assert_response :success
    assert_no_match(/"initialTasks"/, response.body)
    assert_no_match(/#{Regexp.escape(tasks(:one).title)}/, response.body)
  end

  test "home seeds initialTasks scoped to what the signed-in user can see" do
    sign_in_as(@user)
    get root_url
    assert_response :success
    assert_includes response.body, tasks(:one).title # own task
    assert_includes response.body, tasks(:three).title # someone else's public task
    assert_no_match(/#{Regexp.escape(tasks(:four).title)}/, response.body) # someone else's private task
  end

  test "home seeds initialTasks with owner_username on each task" do
    sign_in_as(@user)
    get root_url
    assert_response :success
    assert_includes response.body, "owner_username"
    assert_includes response.body, tasks(:three).user.username
  end

  test "catch-all route renders the SPA shell for /tasks/new" do
    get "/tasks/new"
    assert_response :success
  end

  test "catch-all route seeds initialTask when signed in and the task is visible" do
    sign_in_as(@user)
    get "/tasks/#{tasks(:one).id}/edit"
    assert_response :success
    assert_includes response.body, tasks(:one).title
  end

  test "catch-all route does not seed initialTask when signed out" do
    get "/tasks/#{tasks(:one).id}/edit"
    assert_response :success
    assert_no_match(/"initialTask"/, response.body)
  end

  test "catch-all route does not seed initialTask for someone else's private task" do
    sign_in_as(@user)
    get "/tasks/#{tasks(:four).id}/edit"
    assert_response :success
    assert_no_match(/"initialTask"/, response.body)
  end

  test "catch-all route renders successfully for a nonexistent task id without an initialTask prop" do
    sign_in_as(@user)
    get "/tasks/999999/edit"
    assert_response :success
    assert_no_match(/"initialTask"/, response.body)
  end

  test "does not swallow unmatched /api routes into the SPA shell" do
    get "/api/bogus"
    assert_response :not_found
  end

  test "does not swallow a bare /api request into the SPA shell" do
    get "/api"
    assert_response :not_found
  end

  test "does not swallow the OpenAPI docs route into the SPA shell" do
    get "/docs"
    assert_response :success
  end
end

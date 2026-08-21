require "test_helper"

class MissionControlJobsControllerTest < ActionDispatch::IntegrationTest
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

  test "redirects to login when signed out" do
    get "/jobs"
    assert_redirected_to "/login"
  end

  test "renders the dashboard when signed in" do
    sign_in_as(@user)
    get "/jobs"
    assert_response :success
  end

  test "does not accept HTTP Basic auth in place of a session (engine's own auth is disabled)" do
    get "/jobs", headers: { "HTTP_AUTHORIZATION" => "Basic #{Base64.strict_encode64('dev:secret')}" }
    assert_redirected_to "/login"
  end
end

require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "home renders successfully" do
    get root_url
    assert_response :success
  end
end

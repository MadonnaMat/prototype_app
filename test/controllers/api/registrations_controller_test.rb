require "test_helper"

module Api
  class RegistrationsControllerTest < ActionDispatch::IntegrationTest
    test "create with valid params registers, logs in, and returns an initial api_token" do
      assert_difference("User.count") do
        post api_registration_url, params: {
          username: "newuser", email_address: "new@example.com",
          password: "password", password_confirmation: "password"
        }, as: :json
      end
      assert_response :created
      body = JSON.parse(response.body)
      assert_equal "newuser", body["user"]["username"]
      assert body["user"]["api_token"].present?
      assert_equal true, body["meta"]["success"]
      assert cookies[:session_id].present?
    end

    test "create with a duplicate username returns a validation error" do
      post api_registration_url, params: {
        username: users(:one).username, email_address: "someone-else@example.com",
        password: "password", password_confirmation: "password"
      }, as: :json
      assert_response :unprocessable_entity
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_includes meta["errors"]["username"], "has already been taken"
    end

    test "create with a duplicate email_address returns a validation error" do
      post api_registration_url, params: {
        username: "newuser", email_address: users(:one).email_address,
        password: "password", password_confirmation: "password"
      }, as: :json
      assert_response :unprocessable_entity
      assert_equal "application/json; charset=utf-8", response.content_type
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_includes meta["errors"]["email_address"], "has already been taken"
    end

    test "create with a missing password returns a validation error" do
      post api_registration_url, params: { username: "newuser", email_address: "new@example.com" }, as: :json
      assert_response :unprocessable_entity
      assert_equal "application/json; charset=utf-8", response.content_type
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert meta["errors"]["password"].present?
    end
  end
end

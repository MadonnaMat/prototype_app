require "test_helper"

module Api
  class SessionsControllerTest < ActionDispatch::IntegrationTest
    test "create with valid credentials logs in and sets a session cookie" do
      assert_difference("Session.count") do
        post api_session_url, params: { email_address: users(:one).email_address, password: "password" }, as: :json
      end
      assert_response :created
      assert_equal "application/json; charset=utf-8", response.content_type
      body = JSON.parse(response.body)
      assert_equal "alice", body["user"]["username"]
      assert_nil body["user"]["api_token"]
      assert_equal true, body["meta"]["success"]
      assert cookies[:session_id].present?
    end

    test "create with invalid password returns unauthorized as json without revealing which field was wrong" do
      post api_session_url, params: { email_address: users(:one).email_address, password: "wrong" }, as: :json
      assert_response :unauthorized
      meta = JSON.parse(response.body)["meta"]
      assert_equal false, meta["success"]
      assert_equal "Invalid email or password", meta["error"]
    end

    test "create with unknown email returns unauthorized as json" do
      post api_session_url, params: { email_address: "nobody@example.com", password: "password" }, as: :json
      assert_response :unauthorized
    end

    test "destroy clears the session cookie" do
      post api_session_url, params: { email_address: users(:one).email_address, password: "password" }, as: :json
      assert_difference("Session.count", -1) do
        delete api_session_url, as: :json
      end
      assert_response :success
      assert_equal true, JSON.parse(response.body)["meta"]["success"]
    end

    test "an established session cookie authenticates subsequent API requests" do
      post api_session_url, params: { email_address: users(:one).email_address, password: "password" }, as: :json
      get api_tasks_url, as: :json
      assert_response :success
    end
  end
end

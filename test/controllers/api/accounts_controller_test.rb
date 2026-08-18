require "test_helper"

module Api
  class AccountsControllerTest < ActionDispatch::IntegrationTest
    setup do
      @auth_headers = { "Authorization" => "Bearer test-token-one" }
    end

    test "show without a token returns unauthenticated" do
      get api_account_url, as: :json
      assert_response :unauthorized
    end

    test "show returns the current user without a token" do
      get api_account_url, headers: @auth_headers, as: :json
      assert_response :success
      body = JSON.parse(response.body)
      assert_equal "alice", body["user"]["username"]
      assert_nil body["user"]["api_token"]
    end

    test "update changes the username" do
      patch api_account_url, params: { username: "alice2" }, headers: @auth_headers, as: :json
      assert_response :success
      assert_equal "alice2", JSON.parse(response.body)["user"]["username"]
      assert_equal "alice2", users(:one).reload.username
    end

    test "update with a taken username returns a validation error" do
      patch api_account_url, params: { username: users(:two).username }, headers: @auth_headers, as: :json
      assert_response :unprocessable_entity
    end

    test "regenerate_token returns a fresh token and invalidates the old one" do
      old_token = "test-token-one"

      post regenerate_token_api_account_url, headers: @auth_headers, as: :json
      assert_response :success
      new_token = JSON.parse(response.body)["user"]["api_token"]
      assert new_token.present?
      assert_not_equal old_token, new_token

      get api_account_url, headers: { "Authorization" => "Bearer #{old_token}" }, as: :json
      assert_response :unauthorized

      get api_account_url, headers: { "Authorization" => "Bearer #{new_token}" }, as: :json
      assert_response :success
    end
  end
end

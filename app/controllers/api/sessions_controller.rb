module Api
  # Logs the browser SPA in/out via a session cookie — see
  # Api::BaseController#authenticate_request! for how this differs from,
  # and stays independent of, the long-lived api_token used by MCP/external
  # API clients (Api::AccountController#regenerate_token).
  class SessionsController < Api::BaseController
    skip_before_action :authenticate_request!, only: %i[create destroy]
    rate_limit to: 10, within: 3.minutes, only: :create,
      with: -> { render_error("Try again later.", status: :too_many_requests) }

    # @summary Log in
    # @request_body Credentials [!Hash{ email_address: !String, password: !String }]
    # @request_body_example Basic login [JSON {"email_address": "one@example.com", "password": "password"}]
    # @response Logged in(201) [Hash{ user: Hash{ id: !Integer, username: !String, email_address: !String, api_token: String }, meta: Hash{ success: Boolean } }]
    # @response Invalid credentials(401) [Hash{ meta: Hash{ success: Boolean, error: String } }]
    def create
      user = User.authenticate_by(session_params)

      if user
        start_new_session_for(user)
        render_resource(user: user_json(user), status: :created)
      else
        render_error("Invalid email or password", status: :unauthorized)
      end
    end

    # @summary Log out
    # @response Logged out(200) [Hash{ meta: Hash{ success: Boolean } }]
    def destroy
      Current.session ||= find_session_by_cookie
      Current.session&.destroy
      cookies.delete(:session_id)
      render_resource
    end

    private

    def session_params
      params.permit(:email_address, :password)
    end
  end
end

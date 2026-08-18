module Api
  class RegistrationsController < Api::BaseController
    skip_before_action :authenticate_request!, only: :create

    # @summary Register a new account
    # @request_body Account attributes [!Hash{ username: !String, email_address: !String, password: !String, password_confirmation: String }]
    # @request_body_example Basic registration [JSON {"username": "newuser", "email_address": "new@example.com", "password": "password", "password_confirmation": "password"}]
    # @response Registered(201) [Hash{ user: Hash{ id: !Integer, username: !String, email_address: !String, api_token: !String }, meta: Hash{ success: Boolean } }]
    # @response Validation error(422) [Hash{ meta: Hash{ success: Boolean, errors: Hash{ username: Array<String> } } }]
    def create
      user = User.new(registration_params)

      if user.save
        start_new_session_for(user)
        render_resource(user: user_json(user), status: :created)
      else
        render_validation_error(user.errors)
      end
    end

    private

    def registration_params
      params.permit(:username, :email_address, :password, :password_confirmation)
    end
  end
end

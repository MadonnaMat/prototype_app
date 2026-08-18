module Api
  class AccountsController < Api::BaseController
    # @summary Get the current account
    # @response Account(200) [Hash{ user: Hash{ id: !Integer, username: !String, email_address: !String, api_token: !String }, meta: Hash{ success: Boolean } }]
    def show
      render_resource(user: user_json(Current.user))
    end

    # @summary Update the current account
    # @request_body Account attributes [Hash{ username: String }]
    # @response Updated(200) [Hash{ user: Hash{ id: !Integer, username: !String, email_address: !String, api_token: !String }, meta: Hash{ success: Boolean } }]
    # @response Validation error(422) [Hash{ meta: Hash{ success: Boolean, errors: Hash{ username: Array<String> } } }]
    def update
      if Current.user.update(account_params)
        render_resource(user: user_json(Current.user))
      else
        render_validation_error(Current.user.errors)
      end
    end

    # @summary Regenerate the current account's API token
    # @response Regenerated(200) [Hash{ user: Hash{ id: !Integer, username: !String, email_address: !String, api_token: !String }, meta: Hash{ success: Boolean } }]
    def regenerate_token
      Current.user.regenerate_api_token!
      render_resource(user: user_json(Current.user))
    end

    private

    def account_params
      params.permit(:username)
    end
  end
end

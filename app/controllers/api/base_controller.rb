module Api
  # Base controller for all JSON API endpoints. Ensures API responses are
  # always JSON, even for errors that would otherwise hit Rails' HTML
  # exception pages (e.g. ActiveRecord::RecordNotFound, or any unhandled
  # StandardError), and that every response follows the same envelope:
  #   { <resource>: ..., meta: { success: true } }
  #   { meta: { success: false, error/errors: ... } }
  class BaseController < ApplicationController
    # Bearer-token clients (MCP, external API clients) can't produce a Rails
    # CSRF token, so they're exempted; the browser SPA's cookie-authenticated
    # requests go through the normal check (enforced via the X-CSRF-Token
    # header the SPA sends — see app/javascript/api/client.ts).
    skip_before_action :verify_authenticity_token, if: -> { request.headers["Authorization"].present? }
    before_action :authenticate_request!

    rescue_from StandardError, with: :render_internal_server_error
    rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
    rescue_from ActionController::ParameterMissing, with: :render_bad_request
    rescue_from ActionDispatch::Http::Parameters::ParseError, with: :render_bad_request
    rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid

    private

    # Renders a successful response. Pass the resource(s) scoped by model name,
    # e.g. render_resource(task: @task) or render_resource(tasks: Task.all).
    def render_resource(status: :ok, **data)
      render json: data.merge(meta: { success: true }), status: status
    end

    def render_validation_error(errors)
      render json: { meta: { success: false, errors: errors } }, status: :unprocessable_entity
    end

    # Catches a `save!`/`create!`/`update!` that raises on invalid attributes
    # (e.g. ChatController creating a Conversation from blank message
    # content) so it renders the same 422 envelope as an explicit
    # render_validation_error call, instead of falling through to the
    # StandardError catch-all as an unhandled-looking 500.
    def render_record_invalid(exception)
      render_validation_error(exception.record.errors)
    end

    def render_not_found(exception)
      render_error(exception, status: :not_found)
    end

    def render_bad_request(exception)
      render_error(exception, status: :bad_request)
    end

    def render_internal_server_error(exception)
      render_error(exception, status: :internal_server_error)
    end

    # Accepts either an exception (from rescue_from) or a plain message
    # (from an explicit check like authenticate_api_token!), so both paths
    # produce the same { meta: { success: false, error: ... } } envelope.
    def render_error(exception_or_message, status:)
      message = exception_or_message.respond_to?(:message) ? exception_or_message.message : exception_or_message
      meta = { success: false, error: message }
      meta[:backtrace] = exception_or_message.backtrace if exception_or_message.respond_to?(:backtrace) && Rails.env.local?
      render json: { meta: meta }, status: status
    end

    # Accepts either a Bearer API token (MCP, external API clients — long-
    # lived, unaffected by browser login/logout) or the browser SPA's
    # session cookie (same-origin fetch sends it automatically; no manual
    # header wiring needed client-side). Token is checked first since its
    # presence signals explicit client intent.
    def authenticate_request!
      Current.user = authenticate_via_token || authenticate_via_cookie
      render_error("Unauthenticated", status: :unauthorized) unless Current.user
    end

    def authenticate_via_token
      User.authenticate_by_bearer_header(request.headers["Authorization"])
    end

    def authenticate_via_cookie
      Current.session = find_session_by_cookie
      Current.session&.user
    end

    # Only for a user's own account responses (login/registration/account) —
    # never used to serialize another user, so the token never leaks via a
    # task's owner_username (see TaskSerialization#task_json). api_token is
    # a method, not a column (see User#api_token) — it's only non-nil right
    # after generate_api_token ran in this same request (create/login/
    # regenerate_token); any other response has a freshly-loaded user with
    # no token to show, by design.
    def user_json(user)
      user.as_json(only: %i[id username email_address], methods: :api_token)
    end
  end
end

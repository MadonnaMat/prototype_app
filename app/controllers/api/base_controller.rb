module Api
  # Base controller for all JSON API endpoints. Ensures API responses are
  # always JSON, even for errors that would otherwise hit Rails' HTML
  # exception pages (e.g. ActiveRecord::RecordNotFound, or any unhandled
  # StandardError), and that every response follows the same envelope:
  #   { <resource>: ..., meta: { success: true } }
  #   { meta: { success: false, error/errors: ... } }
  class BaseController < ApplicationController
    skip_before_action :verify_authenticity_token

    rescue_from StandardError, with: :render_internal_server_error
    rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
    rescue_from ActionController::ParameterMissing, with: :render_bad_request
    rescue_from ActionDispatch::Http::Parameters::ParseError, with: :render_bad_request

    private

    # Renders a successful response. Pass the resource(s) scoped by model name,
    # e.g. render_resource(task: @task) or render_resource(tasks: Task.all).
    def render_resource(status: :ok, **data)
      render json: data.merge(meta: { success: true }), status: status
    end

    def render_validation_error(errors)
      render json: { meta: { success: false, errors: errors } }, status: :unprocessable_entity
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

    def render_error(exception, status:)
      meta = { success: false, error: exception.message }
      meta[:backtrace] = exception.backtrace if Rails.env.local?
      render json: { meta: meta }, status: status
    end
  end
end

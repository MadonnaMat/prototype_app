# Rack middleware wrapping the MCP transport. Populates Current.user from a
# Bearer token if present, but never itself rejects a request — this lets
# the `initialize` handshake succeed unauthenticated (matching MCP clients
# that don't send a token until they actually call a tool/resource). Real
# gating happens at tool-call time (TaskSerialization#rescue_errors) and
# resource-read time (McpUnauthorizedError), mirroring how
# Api::BaseController#authenticate_via_token works for the JSON API.
class McpTokenAuthentication
  def initialize(app)
    @app = app
  end

  def call(env)
    token = Rack::Request.new(env).get_header("HTTP_AUTHORIZATION")&.delete_prefix("Bearer ")
    Current.user = User.authenticate_by_token(token) if token.present?
    @app.call(env)
  end
end

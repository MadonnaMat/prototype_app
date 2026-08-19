# Rack middleware wrapping the MCP transport. Populates Current.user from a
# Bearer token if present, but never itself rejects a request — this lets
# the `initialize` handshake succeed unauthenticated (matching MCP clients
# that don't send a token until they actually call a tool/resource). Real
# gating happens at tool-call time (TaskSerialization#rescue_errors) and
# resource-read time (McpUnauthorizedError), mirroring how
# Api::BaseController#authenticate_via_token works for the JSON API.
#
# Accepts either a user's persistent API token or a McpDelegationToken —
# see that class for why /chat/completions uses the latter instead of a
# session cookie or the persistent token.
class McpTokenAuthentication
  def initialize(app)
    @app = app
  end

  def call(env)
    header = Rack::Request.new(env).get_header("HTTP_AUTHORIZATION")
    Current.user = User.authenticate_by_bearer_header(header) || McpDelegationToken.authenticate(header&.delete_prefix("Bearer "))
    @app.call(env)
  end
end

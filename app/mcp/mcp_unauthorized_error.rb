# Raised from a resource's/template's `contents` when there's no
# authenticated Current.user — resources have no per-response `isError`
# flag (unlike tools, see TaskSerialization#rescue_errors), so a clean
# protocol-level JSON-RPC error is the only way to reject the read.
# -32001 sits in the JSON-RPC spec's reserved "server error" range
# (-32000..-32099), same convention MCP::Server::ResourceNotFoundError uses.
class McpUnauthorizedError < MCP::Server::RequestHandlerError
  def initialize(request = nil)
    super("Unauthorized", request, error_type: :internal_error, error_code: -32001, error_data: {})
  end
end

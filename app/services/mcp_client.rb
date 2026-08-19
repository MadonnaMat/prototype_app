# Thin wrapper around the mcp gem's own MCP::Client + MCP::Client::HTTP,
# used to call the app's own /mcp server as a real MCP client (JSON-RPC
# over HTTP loopback) rather than calling the app/mcp/*_tool.rb classes
# directly. `bearer_token:` is the full `Authorization` header value (not
# just the token) — pass through whatever the /chat/completions request
# itself received, so MCP-side task ownership/visibility scoping is
# preserved as the same user, not a privileged service account.
class McpClient
  def initialize(base_url:, bearer_token:)
    transport = MCP::Client::HTTP.new(url: base_url, headers: { "Authorization" => bearer_token }.compact)
    @client = MCP::Client.new(transport: transport)
    @client.connect
  end

  def tool_specs
    @client.tools.map { |tool| { name: tool.name, description: tool.description, parameters: tool.input_schema } }
  end

  def call_tool(name:, arguments:)
    result = @client.call_tool(name: name, arguments: arguments).fetch("result", {})
    text = Array(result["content"]).filter_map { |block| block["text"] if block["type"] == "text" }.join("\n")
    { text: text, error: !!result["isError"] }
  end
end

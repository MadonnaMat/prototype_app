# Builds the app's MCP server + Streamable HTTP transport, called once from
# config/routes.rb (not an initializer — Zeitwerk autoloading for app/mcp
# tool classes isn't guaranteed ready when initializers run).
#
# NOTE: StreamableHTTPTransport keeps session state in memory, so this only
# works correctly with a single Puma process. config/puma.rb has no
# WEB_CONCURRENCY set today (single worker), which is what makes this safe;
# if that ever changes (or Kamal scales to multiple containers behind a
# non-sticky load balancer), MCP sessions will break with intermittent
# "unknown session" 404s.
#
# enable_json_response: true — without it, the transport answers every POST
# after `initialize` (tools/list, tools/call, ...) as an SSE stream instead of
# a plain JSON response (only `initialize` itself is plain JSON by default).
# This app has no need for server-initiated push, so a single JSON object per
# request is simpler for clients and tests alike (confirmed against the
# installed gem's lib/mcp/server/transports/streamable_http_transport.rb).
class McpServerBuilder
  class << self
    def transport
      @transport ||= MCP::Server::Transports::StreamableHTTPTransport.new(server, enable_json_response: true)
    end

    private

    def server
      MCP::Server.new(
        name: "prototype_app_mcp_server",
        title: "Prototype App MCP Server",
        version: "1.0.0",
        tools: [
          ListTasksTool,
          CreateTaskTool,
          UpdateTaskTool,
          CompleteTaskTool,
          DeleteTaskTool,
        ],
      )
    end
  end
end

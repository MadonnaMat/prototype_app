# Builds the app's MCP server + Streamable HTTP transport, called once from
# config/routes.rb (not an initializer — Zeitwerk autoloading for app/mcp
# tool classes isn't guaranteed ready when initializers run).
#
# NOTE: StreamableHTTPTransport keeps session state in memory, so this only
# works correctly with a single Puma process. `build_transport` raises at
# boot if WEB_CONCURRENCY implies more than one worker, so a config change
# made for unrelated reasons (e.g. bumping worker count under load) fails
# loudly at startup instead of showing up later as intermittent "unknown
# session" errors on MCP clients. If multi-worker/multi-container ever
# becomes a real requirement, this transport needs an external session store
# (e.g. Redis) before the guard can be removed.
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
      @transport ||= build_transport
    end

    private

    def build_transport
      workers = ENV["WEB_CONCURRENCY"]
      if workers.present? && !%w[0 1].include?(workers)
        raise "McpServerBuilder requires a single Puma worker (unset WEB_CONCURRENCY, " \
              "or set it to 0/1) because MCP session state is kept in memory; got " \
              "WEB_CONCURRENCY=#{workers.inspect}."
      end

      streamable_transport = MCP::Server::Transports::StreamableHTTPTransport.new(server, enable_json_response: true)

      # Wraps the transport with token authentication (see
      # McpTokenAuthentication) so every tool call and resource read is
      # gated the same way the JSON API is gated.
      Rack::Builder.new do
        use McpTokenAuthentication
        run streamable_transport
      end.to_app
    end

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
          DeleteTaskTool
        ],
        resources: [ TasksResource ],
        resource_templates: [ TaskResourceTemplate ],
      )
    end
  end
end

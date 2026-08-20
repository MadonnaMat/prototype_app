# Thin wrapper around the mcp gem's own MCP::Client + MCP::Client::HTTP,
# used to call the app's own /mcp server as a real MCP client (JSON-RPC
# over HTTP loopback) rather than calling the app/mcp/*_tool.rb classes
# directly. `bearer_token:` is the full `Authorization` header value (not
# just the token) — pass through whatever the /chat/completions request
# itself received, so MCP-side task ownership/visibility scoping is
# preserved as the same user, not a privileged service account.
class McpClient
  # This is a loopback call to the app's own /mcp — legitimate calls
  # complete in well under a second, so a short timeout is appropriate. A
  # missing timeout here was observed hanging for 60-120s (see
  # without_reload_lock) rather than failing fast with a clear error.
  REQUEST_TIMEOUT = 30

  def initialize(base_url:, bearer_token:)
    transport = MCP::Client::HTTP.new(url: base_url, headers: { "Authorization" => bearer_token }.compact) do |faraday|
      faraday.options.open_timeout = 5
      faraday.options.timeout = REQUEST_TIMEOUT
    end
    @client = MCP::Client.new(transport: transport)
    without_reload_lock { @client.connect }
  end

  def tool_specs
    without_reload_lock { @client.tools }.map { |tool| { name: tool.name, description: tool.description, parameters: tool.input_schema } }
  end

  # `data:` is the tool's response JSON parsed to a Hash (symbolized keys),
  # or nil when the response isn't JSON (error responses are a plain
  # message string, not JSON — see TaskSerialization#rescue_errors et al.)
  # or call_tool itself errored. Callers that need to know *what* changed
  # (e.g. ChatOrchestrator's task-change metadata) read this instead of
  # re-parsing `text` themselves.
  def call_tool(name:, arguments:)
    result = without_reload_lock { @client.call_tool(name: name, arguments: arguments) }.fetch("result", {})
    text = Array(result["content"]).filter_map { |block| block["text"] if block["type"] == "text" }.join("\n")
    { text: text, error: !!result["isError"], data: parse_json(text) }
  end

  private

  def parse_json(text)
    JSON.parse(text, symbolize_names: true)
  rescue JSON::ParserError
    nil
  end

  # Any caller of McpClient that's itself handling a request in this same
  # Rails app (as ChatController is) is, at the moment it calls in here,
  # holding a shared lock that blocks class-unloading for the rest of its
  # own request — this is how development mode (config.enable_reloading)
  # keeps autoloaded constants stable mid-request. Calling back into this
  # same app over HTTP while holding that lock risks deadlock: the inner
  # request needs its own copy of the same lock, and if a reload check
  # needs the exclusive lock in the window between the two, the outer
  # request (waiting on the inner one) and the inner request (queued
  # behind the pending exclusive lock) block on each other until a
  # timeout — observed hanging 60-120s before failing. Releasing the lock
  # around each blocking network call and reacquiring it after avoids
  # that. Only real contention in dev (reloading is off elsewhere), where
  # this is a cheap no-op.
  def without_reload_lock
    interlock = ActiveSupport::Dependencies.interlock
    interlock.done_running
    yield
  ensure
    interlock.start_running
  end
end

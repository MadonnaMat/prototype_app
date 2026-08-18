# Read-only resource listing every task visible to the current user (their
# own tasks plus everyone's public tasks) — the resource counterpart to
# ListTasksTool's index-style read, but as a static resource rather than a
# paginated tool call.
class TasksResource < MCP::Resource
  uri "tasks://all"
  resource_name "tasks"
  title "All Visible Tasks"
  description "Every task visible to the current user: their own tasks, plus everyone's public tasks."
  mime_type "application/json"

  def self.contents(server_context: nil)
    McpResourceAuthorization.require_user!

    tasks = Task.visible_to(Current.user).includes(:user).order(:id)
    payload = { tasks: tasks.map { |task| TaskSerialization.task_json(task) } }.to_json

    MCP::Resource::TextContents.new(uri: uri_value, mime_type: mime_type_value, text: payload)
  end
end

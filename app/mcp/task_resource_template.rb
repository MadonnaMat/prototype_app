# Read-only per-task resource, the resource counterpart to
# Api::TasksController#show / the tools' find_task lookup. A malformed id
# and an unknown/invisible id are treated identically (ResourceNotFoundError)
# — both mean "nothing readable at this URI" — kept simple rather than
# inventing a second error case for a non-numeric id.
class TaskResourceTemplate < MCP::ResourceTemplate
  uri_template "task://{id}"
  resource_template_name "task"
  title "Single Task"
  description "A single task by id, if visible to the current user."
  mime_type "application/json"

  def self.contents(id:, server_context: nil)
    McpResourceAuthorization.require_user!

    task = Task.visible_to(Current.user).includes(:user).find_by(id: id) if id.match?(/\A\d+\z/)
    raise MCP::Server::ResourceNotFoundError.new("task://#{id}") unless task

    MCP::Resource::TextContents.new(
      uri: "task://#{id}",
      mime_type: mime_type_value,
      text: TaskSerialization.task_json(task).to_json,
    )
  end
end

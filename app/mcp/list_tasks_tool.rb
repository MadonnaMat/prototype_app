class ListTasksTool < MCP::Tool
  tool_name "list_tasks"
  title "List Tasks"
  description "List all tasks."
  input_schema(properties: {}, required: [])

  def self.call(server_context:)
    tasks = Task.all.map { |t| TaskSerialization.task_json(t) }
    MCP::Tool::Response.new([{ type: "text", text: tasks.to_json }])
  end
end

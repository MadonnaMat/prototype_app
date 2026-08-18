class DeleteTaskTool < MCP::Tool
  tool_name "delete_task"
  title "Delete Task"
  description "Delete a task."
  input_schema(properties: { id: { type: "integer" } }, required: ["id"])

  def self.call(id:, server_context:)
    task = Task.find_by(id: id)
    return TaskSerialization.not_found_response(id) unless task

    task.destroy
    MCP::Tool::Response.new([{ type: "text", text: { id: id, deleted: true }.to_json }])
  end
end

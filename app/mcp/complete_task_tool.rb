class CompleteTaskTool < MCP::Tool
  tool_name "complete_task"
  title "Complete Task"
  description "Mark a task as done."
  input_schema(properties: { id: { type: "integer" } }, required: ["id"])

  def self.call(id:, server_context:)
    task = Task.find_by(id: id)
    return TaskSerialization.not_found_response(id) unless task

    task.update(done: true)
    TaskSerialization.persist_response(task)
  end
end

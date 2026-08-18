class UpdateTaskTool < MCP::Tool
  tool_name "update_task"
  title "Update Task"
  description "Update an existing task's title, description, and/or done state."
  input_schema(
    properties: {
      id: { type: "integer" },
      title: { type: "string" },
      description: { type: "string" },
      done: { type: "boolean" },
    },
    required: ["id"],
  )

  def self.call(id:, server_context:, **attrs)
    task = Task.find_by(id: id)
    return TaskSerialization.not_found_response(id) unless task

    task.update(attrs.slice(:title, :description, :done))
    TaskSerialization.persist_response(task)
  end
end

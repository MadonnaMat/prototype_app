class UpdateTaskTool < MCP::Tool
  tool_name "update_task"
  title "Update Task"
  description "Update an existing task's title, description, and/or done state."
  input_schema(
    properties: {
      id: { type: "integer" },
      title: { type: "string" },
      description: { type: "string" },
      done: { type: "boolean" }
    },
    required: [ "id" ],
    additionalProperties: false,
  )

  def self.call(id:, server_context:, **attrs)
    TaskSerialization.rescue_errors do
      TaskSerialization.find_task(id) do |task|
        success = task.update(attrs.slice(:title, :description, :done))
        TaskSerialization.persist_response(task, success)
      end
    end
  end
end

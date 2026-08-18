class CreateTaskTool < MCP::Tool
  tool_name "create_task"
  title "Create Task"
  description "Create a new task."
  input_schema(
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      done: { type: "boolean" }
    },
    required: [ "title" ],
    additionalProperties: false,
  )

  def self.call(title:, server_context:, description: nil, done: false, **)
    TaskSerialization.rescue_errors do
      task = Task.new(title: title, description: description, done: done)
      success = task.save
      TaskSerialization.persist_response(task, success)
    end
  end
end

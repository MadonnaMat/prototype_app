class CreateTaskTool < MCP::Tool
  tool_name "create_task"
  title "Create Task"
  description "Create a new task."
  input_schema(
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      done: { type: "boolean" },
      is_public: { type: "boolean" }
    },
    required: [ "title" ],
    additionalProperties: false,
  )

  def self.call(title:, server_context:, description: nil, done: false, is_public: false, **)
    TaskSerialization.rescue_errors do
      task = Current.user.tasks.new(title: title, description: description, done: done, is_public: is_public)
      success = task.save
      TaskSerialization.persist_response(task, success)
    end
  end
end

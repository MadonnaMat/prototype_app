class CompleteTaskTool < MCP::Tool
  tool_name "complete_task"
  title "Complete Task"
  description "Mark a task as done."
  input_schema(
    properties: { id: { type: "integer" } },
    required: [ "id" ],
    additionalProperties: false,
  )

  def self.call(id:, server_context:, **)
    TaskSerialization.rescue_errors do
      TaskSerialization.find_task(id) do |task|
        success = task.update(done: true)
        TaskSerialization.persist_response(task, success)
      end
    end
  end
end

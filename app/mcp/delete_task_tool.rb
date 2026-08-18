class DeleteTaskTool < MCP::Tool
  tool_name "delete_task"
  title "Delete Task"
  description "Delete a task."
  input_schema(
    properties: { id: { type: "integer", minimum: 1 } },
    required: [ "id" ],
    additionalProperties: false,
  )

  def self.call(id:, server_context:, **)
    TaskSerialization.rescue_errors do
      TaskSerialization.find_owned_task(id) do |task|
        if task.destroy
          TaskSerialization.deleted_response(id)
        else
          TaskSerialization.persist_response(task, false)
        end
      end
    end
  end
end

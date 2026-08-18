module TaskSerialization
  module_function

  def task_json(task)
    task.as_json(only: Task::API_ATTRIBUTES)
  end

  def not_found_response(id)
    MCP::Tool::Response.new([ { type: "text", text: "Task #{id} not found" } ], error: true)
  end

  # Shared by create/update/complete: each calls task.save or task.update
  # first (populating task.errors on failure), then hands the task here.
  # Avoids repeating the same success/validation-error branch three times.
  def persist_response(task)
    if task.errors.empty?
      MCP::Tool::Response.new([ { type: "text", text: task_json(task).to_json } ])
    else
      MCP::Tool::Response.new(
        [ { type: "text", text: task.errors.full_messages.join(", ") } ],
        error: true,
      )
    end
  end
end

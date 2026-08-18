class ListTasksTool < MCP::Tool
  DEFAULT_LIMIT = 25
  MAX_LIMIT = 200

  tool_name "list_tasks"
  title "List Tasks"
  description "List tasks, ordered by id. Returns at most `limit` tasks " \
    "(default #{DEFAULT_LIMIT}, max #{MAX_LIMIT}); pass the response's " \
    "next_cursor back as `cursor` to fetch the next page."
  input_schema(
    properties: {
      limit: { type: "integer", minimum: 1, maximum: MAX_LIMIT },
      cursor: { type: "integer", minimum: 1 }
    },
    required: [],
    additionalProperties: false,
  )

  def self.call(server_context:, limit: DEFAULT_LIMIT, cursor: nil, **)
    TaskSerialization.rescue_errors do
      scope = Task.visible_to(Current.user).order(:id)
      scope = scope.where("id > ?", cursor) if cursor
      tasks = scope.limit(limit).to_a

      next_cursor = tasks.last.id if tasks.size == limit
      TaskSerialization.list_response(tasks, next_cursor: next_cursor)
    end
  end
end

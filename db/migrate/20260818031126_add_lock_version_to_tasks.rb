class AddLockVersionToTasks < ActiveRecord::Migration[8.1]
  def change
    # Rails' built-in optimistic locking (ActiveRecord::Locking::Optimistic)
    # activates automatically on any column named lock_version. Closes a
    # find-then-mutate race in the MCP update/complete/delete tools: without
    # this, two concurrent calls for the same task id could both pass the
    # not-found check, then the "losing" call's update/destroy silently
    # affects 0 rows while still reporting success. With this column,
    # ActiveRecord::StaleObjectError is raised instead, which the MCP tools
    # rescue into a normal "please retry" error response.
    add_column :tasks, :lock_version, :integer, default: 0, null: false
  end
end

class AddUserAndIsPublicToTasks < ActiveRecord::Migration[8.1]
  def up
    add_reference :tasks, :user, foreign_key: true
    add_column :tasks, :is_public, :boolean, default: false, null: false

    legacy_user = User.find_or_create_by!(username: "legacy") do |user|
      user.email_address = "legacy@example.com"
      user.password = SecureRandom.hex(16)
    end

    # Pre-existing tasks predate per-user ownership: attribute them to a
    # placeholder "legacy" user and mark them public (rather than defaulting
    # every future task to public) so they remain visible to everyone
    # exactly as they were before this migration.
    execute <<~SQL.squish
      UPDATE tasks SET user_id = #{legacy_user.id}, is_public = TRUE WHERE user_id IS NULL
    SQL

    change_column_null :tasks, :user_id, false
  end

  def down
    remove_column :tasks, :is_public
    remove_reference :tasks, :user
  end
end

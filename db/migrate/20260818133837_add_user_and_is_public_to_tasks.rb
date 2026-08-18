class AddUserAndIsPublicToTasks < ActiveRecord::Migration[8.1]
  # A migration-local model, deliberately not the app's User class: at this
  # point in schema history the token column is still named `api_token`
  # (renamed to `api_token_digest` by the later SecureUserApiTokens
  # migration), so going through the live User model's before_create
  # callback would try to write a column that doesn't exist yet when this
  # migration is replayed from scratch.
  class MigrationUser < ActiveRecord::Base
    self.table_name = "users"
  end

  def up
    add_reference :tasks, :user, foreign_key: true
    add_column :tasks, :is_public, :boolean, default: false, null: false

    legacy_user = MigrationUser.find_by(username: "legacy") || MigrationUser.create!(
      username: "legacy",
      email_address: "legacy@example.com",
      password_digest: BCrypt::Password.create(SecureRandom.hex(16)),
      api_token: SecureRandom.base58(24)
    )

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

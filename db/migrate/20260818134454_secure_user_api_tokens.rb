class SecureUserApiTokens < ActiveRecord::Migration[8.1]
  def up
    rename_column :users, :api_token, :api_token_digest
    User.reset_column_information

    # The plaintext value that used to live in this column is worthless as
    # a digest, so mint every existing user a fresh, properly-hashed token
    # (there's only ever the "legacy" user at this point in the app's life).
    User.find_each(&:regenerate_api_token!)
  end

  def down
    rename_column :users, :api_token_digest, :api_token
  end
end

class AddUsernameAndApiTokenToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :username, :string, null: false
    add_index :users, :username, unique: true
    add_column :users, :api_token, :string
    add_index :users, :api_token, unique: true
  end
end

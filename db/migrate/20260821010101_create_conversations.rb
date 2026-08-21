class CreateConversations < ActiveRecord::Migration[8.1]
  def change
    create_table :conversations do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false, default: ""
      t.boolean :title_generated, null: false, default: false
      t.text :summary_text
      t.bigint :compacted_through_message_id
      t.integer :last_prompt_tokens

      t.timestamps
    end

    add_index :conversations, [ :user_id, :updated_at ]
  end
end

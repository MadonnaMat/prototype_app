# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_21_010102) do
  create_table "conversations", force: :cascade do |t|
    t.bigint "compacted_through_message_id"
    t.datetime "created_at", null: false
    t.integer "last_prompt_tokens"
    t.text "summary_text"
    t.string "title", default: "", null: false
    t.boolean "title_generated", default: false, null: false
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["user_id", "updated_at"], name: "index_conversations_on_user_id_and_updated_at"
    t.index ["user_id"], name: "index_conversations_on_user_id"
  end

  create_table "messages", force: :cascade do |t|
    t.text "content", null: false
    t.integer "conversation_id", null: false
    t.datetime "created_at", null: false
    t.string "role", null: false
    t.json "task_changes"
    t.datetime "updated_at", null: false
    t.index ["conversation_id", "created_at"], name: "index_messages_on_conversation_id_and_created_at"
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.integer "user_id", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "done", default: false, null: false
    t.boolean "is_public", default: false, null: false
    t.integer "lock_version", default: 0, null: false
    t.string "title"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["user_id"], name: "index_tasks_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "api_token_digest"
    t.datetime "created_at", null: false
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index ["api_token_digest"], name: "index_users_on_api_token_digest", unique: true
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "conversations", "users"
  add_foreign_key "messages", "conversations"
  add_foreign_key "sessions", "users"
  add_foreign_key "tasks", "users"
end

class Message < ApplicationRecord
  ROLES = %w[user assistant].freeze

  belongs_to :conversation, touch: true

  validates :role, inclusion: { in: ROLES }
  validates :content, presence: true

  scope :after, ->(id) { id ? where("id > ?", id) : all }
end

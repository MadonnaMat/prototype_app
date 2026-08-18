class Task < ApplicationRecord
  API_ATTRIBUTES = %i[id title description done created_at updated_at is_public].freeze

  belongs_to :user
  validates :title, presence: true

  scope :visible_to, ->(user) { where(user: user).or(where(is_public: true)) }
end

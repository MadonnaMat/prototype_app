class Task < ApplicationRecord
  API_ATTRIBUTES = %i[id title description done created_at updated_at].freeze

  validates :title, presence: true
end

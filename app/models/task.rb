class Task < ApplicationRecord
  API_ATTRIBUTES = %i[id title description done created_at updated_at is_public].freeze

  belongs_to :user
  validates :title, presence: true

  scope :visible_to, ->(user) { where(user: user).or(where(is_public: true)) }

  # Compares by id rather than `user == other_user` so this never needs to
  # load the associated User row just to answer an ownership check.
  def owned_by?(user)
    user_id == user&.id
  end
end

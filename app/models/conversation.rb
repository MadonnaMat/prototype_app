class Conversation < ApplicationRecord
  belongs_to :user
  has_many :messages, -> { order(:created_at) }, dependent: :destroy

  validates :title, presence: true

  scope :recent_first, -> { order(updated_at: :desc) }
end

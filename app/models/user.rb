class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy
  has_many :tasks, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :username, presence: true, uniqueness: true

  before_create :generate_api_token

  # The plaintext token, set only in-memory by #generate_api_token (on
  # create, or via #regenerate_api_token!) — only its digest is ever
  # persisted (api_token_digest), so this is nil on any User loaded back
  # from the database. Callers must capture it immediately after one of
  # those two calls; there is no way to recover a lost token, only to
  # regenerate a new one.
  attr_reader :api_token

  def regenerate_api_token!
    generate_api_token
    save!
  end

  # Looks up a user by a presented bearer token without ever storing (or
  # querying by) the token itself in plaintext — only its HMAC digest is
  # comparable, so a database leak alone isn't enough to compute a matching
  # digest for a guessed/brute-forced token; the app's secret_key_base is
  # also required. Keyed (vs. a bare digest) rather than salted-per-user, so
  # a single indexed lookup by digest still works — a per-user salt would
  # mean not knowing which salt to apply until after finding the row.
  def self.authenticate_by_token(raw_token)
    return nil if raw_token.blank?

    find_by(api_token_digest: digest_token(raw_token))
  end

  def self.digest_token(raw_token)
    OpenSSL::HMAC.hexdigest("SHA256", Rails.application.secret_key_base, raw_token)
  end

  private

  def generate_api_token
    @api_token = SecureRandom.base58(24)
    self.api_token_digest = self.class.digest_token(@api_token)
  end
end

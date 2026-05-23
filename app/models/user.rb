require "digest"

class User < ApplicationRecord
  EMAIL_VERIFICATION_TOKEN_TTL = 24.hours

  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :name, presence: true
  validates :email_address,
            presence: true,
            uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP }

  def self.digest_email_verification_token(token)
    Digest::SHA256.hexdigest(token.to_s)
  end

  def self.find_by_email_verification_token(token)
    digest = digest_email_verification_token(token)
    user = find_by(email_verification_token_digest: digest)

    return unless user&.email_verification_token_digest
    return unless ActiveSupport::SecurityUtils.secure_compare(user.email_verification_token_digest, digest)

    user
  end

  def generate_email_verification_token!
    SecureRandom.urlsafe_base64(32).tap do |token|
      update!(
        email_verification_token_digest: self.class.digest_email_verification_token(token),
        verification_sent_at: Time.current
      )
    end
  end

  def email_verified?
    email_verified_at.present?
  end

  def email_verification_expired?
    verification_sent_at.blank? || verification_sent_at < EMAIL_VERIFICATION_TOKEN_TTL.ago
  end

  def verify_email!
    update!(
      email_verified_at: Time.current,
      email_verification_token_digest: nil
    )
  end

  def masked_email_address
    local, domain = email_address.to_s.split("@", 2)
    return email_address if local.blank? || domain.blank?

    "#{local.first}#{'*' * [ local.length - 1, 1 ].max}@#{domain}"
  end
end

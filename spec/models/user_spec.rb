require "rails_helper"

RSpec.describe User, type: :model do
  it "accepts the Phase 2 generator-compatible attributes" do
    user = described_class.new(email_address: "x@y.com", password: "z", name: "X")

    expect(user).to be_valid
  end

  it "normalizes email before validation" do
    user = create(:user, email_address: " USER@Example.COM ")

    expect(user.email_address).to eq("user@example.com")
  end

  it "normalizes email values for lookups" do
    expect(described_class.normalize_email_address(" USER@Example.COM ")).to eq("user@example.com")
  end

  it "generates a single-use verification token digest" do
    user = create(:user, :unverified)

    token = user.generate_email_verification_token!

    expect(token).to be_present
    expect(user.email_verification_token_digest).to eq(described_class.digest_email_verification_token(token))
    expect(user.email_verification_token_digest).not_to include(token)
    expect(user.verification_sent_at).to be_within(2.seconds).of(Time.current)
  end

  it "finds a user by verification token using the stored digest" do
    user = create(:user, :unverified)
    token = user.generate_email_verification_token!

    expect(described_class.find_by_email_verification_token(token)).to eq(user)
    expect(described_class.find_by_email_verification_token("wrong-token")).to be_nil
  end

  it "detects expired verification tokens" do
    fresh = build(:user, :unverified)
    expired = build(:user, :expired_token)

    expect(fresh.email_verification_expired?).to be(false)
    expect(expired.email_verification_expired?).to be(true)
  end

  it "marks a user verified and clears the token digest" do
    user = create(:user, :unverified)

    user.verify_email!

    expect(user).to be_email_verified
    expect(user.email_verification_token_digest).to be_nil
  end

  it "generates password reset tokens" do
    user = create(:user)
    token = user.password_reset_token

    expect(described_class.find_by_password_reset_token!(token)).to eq(user)
    expect(user.password_reset_token_expires_in).to eq(15.minutes)
  end
end

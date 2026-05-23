require "rails_helper"

RSpec.describe "Email verifications", type: :request do
  it "resends a verification link for an unverified user" do
    user = create(:user, :unverified)

    expect do
      post email_verifications_path, params: { email_address: user.email_address }
    end.to have_enqueued_mail(EmailVerificationMailer, :welcome)

    expect(response).to redirect_to(sent_email_verifications_path)
    expect(flash[:notice]).to eq("If that account exists and still needs verification, we sent a fresh link.")
    expect(user.reload.verification_sent_at).to be_within(2.seconds).of(Time.current)
  end

  it "uses the same UX for unknown email probes" do
    post email_verifications_path, params: { email_address: "missing@example.com" }

    expect(response).to redirect_to(sent_email_verifications_path)
    expect(flash[:notice]).to eq("If that account exists and still needs verification, we sent a fresh link.")
  end

  it "marks a valid token verified and rotates the application session" do
    user = create(:user, :unverified)
    token = user.generate_email_verification_token!

    post session_path, params: { email_address: user.email_address, password: "password" }
    old_session = user.sessions.last

    get email_verification_path(token)

    expect(response).to redirect_to(dashboard_path)
    expect(user.reload).to be_email_verified
    expect(user.email_verification_token_digest).to be_nil
    expect(Session.exists?(old_session.id)).to be(false)
    expect(user.sessions.count).to eq(1)
  end

  it "does not consume an expired token" do
    user = create(:user, :expired_token, verification_token: "expired-token")

    get email_verification_path("expired-token")

    expect(response).to redirect_to(expired_email_verifications_path)
    expect(user.reload.email_verified_at).to be_nil
    expect(user.email_verification_token_digest).to be_present
  end

  it "treats replayed or missing tokens like expired links" do
    user = create(:user, :verified)

    get email_verification_path("already-used-token")

    expect(response).to redirect_to(expired_email_verifications_path)
    expect(user.reload).to be_email_verified
  end

  it "throttles repeated verification sends by IP" do
    5.times do |index|
      post email_verifications_path, params: { email_address: "probe#{index}@example.com" }
      expect(response).to have_http_status(:redirect)
    end

    post email_verifications_path, params: { email_address: "probe6@example.com" }

    expect(response).to have_http_status(:too_many_requests)
    expect(response.body).to include("Too many requests")
  end

  it "throttles repeated verification sends by email" do
    3.times do
      post email_verifications_path, params: { email_address: "same@example.com" }
      expect(response).to have_http_status(:redirect)
    end

    post email_verifications_path, params: { email_address: "same@example.com" }

    expect(response).to have_http_status(:too_many_requests)
  end

  it "throttles verification sends by the pending session email" do
    user = create(:user, :unverified)
    post session_path, params: { email_address: user.email_address, password: "password" }

    3.times do
      post email_verifications_path
      expect(response).to have_http_status(:redirect)
    end

    post email_verifications_path

    expect(response).to have_http_status(:too_many_requests)
  end
end

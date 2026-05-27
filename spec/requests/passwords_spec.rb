require "rails_helper"

RSpec.describe "Passwords", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  it "enqueues password reset instructions for a known email address" do
    user = create(:user, :verified, email_address: "demo@example.com")

    expect do
      post passwords_path, params: { email_address: user.email_address }
    end.to have_enqueued_mail(PasswordsMailer, :reset)

    expect(response).to redirect_to(new_session_path)
    expect(flash[:notice]).to eq("Password reset instructions sent (if user with that email address exists).")
  end

  it "uses the same response for unknown email probes without enqueueing mail" do
    expect do
      post passwords_path, params: { email_address: "missing@example.com" }
    end.not_to have_enqueued_mail(PasswordsMailer, :reset)

    expect(response).to redirect_to(new_session_path)
    expect(flash[:notice]).to eq("Password reset instructions sent (if user with that email address exists).")
  end

  it "uses the same response for malformed email input without enqueueing mail" do
    expect do
      post passwords_path, params: { email_address: "not-an-email" }
    end.not_to have_enqueued_mail(PasswordsMailer, :reset)

    expect(response).to redirect_to(new_session_path)
    expect(flash[:notice]).to eq("Password reset instructions sent (if user with that email address exists).")
  end

  it "renders the reset form for a valid token" do
    user = create(:user, :verified)
    token = user.password_reset_token

    get edit_password_path(token)

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Choose a new password")
  end

  it "resets the password and rotates into a fresh session for a valid token" do
    user = create(:user, :verified, password: "old-password", password_confirmation: "old-password")
    old_session = create(:session, user: user)
    token = user.password_reset_token

    put password_path(token), params: { password: "new-password", password_confirmation: "new-password" }

    expect(response).to redirect_to(dashboard_path)
    expect(flash[:notice]).to eq("Password has been reset.")
    expect(user.reload.authenticate("new-password")).to eq(user)
    expect(Session.exists?(old_session.id)).to be(false)
    expect(user.sessions.reload.count).to eq(1)
    expect(User.find_by_password_reset_token(token)).to be_nil

    follow_redirect!
    expect(response).to have_http_status(:ok)
    expect(response.request.path).to eq(dashboard_path)
  end

  it "keeps the current password and sessions when confirmation fails" do
    user = create(:user, :verified, password: "old-password", password_confirmation: "old-password")
    old_session = create(:session, user: user)
    token = user.password_reset_token

    put password_path(token), params: { password: "new-password", password_confirmation: "different-password" }

    expect(response).to redirect_to(edit_password_path(token))
    expect(flash[:alert]).to eq("Passwords did not match.")
    expect(user.reload.authenticate("old-password")).to eq(user)
    expect(Session.exists?(old_session.id)).to be(true)
  end

  it "rejects invalid reset tokens" do
    get edit_password_path("not-a-real-token")

    expect(response).to redirect_to(new_password_path)
    expect(flash[:alert]).to eq("Password reset link is invalid or has expired.")
  end

  it "rejects expired reset tokens" do
    user = create(:user, :verified)
    token = user.password_reset_token

    travel_to(user.password_reset_token_expires_in.from_now + 1.second) do
      get edit_password_path(token)
    end

    expect(response).to redirect_to(new_password_path)
    expect(flash[:alert]).to eq("Password reset link is invalid or has expired.")
  end

  it "throttles repeated reset requests by IP" do
    5.times do |index|
      post passwords_path, params: { email_address: "probe#{index}@example.com" }
      expect(response).to have_http_status(:redirect)
    end

    post passwords_path, params: { email_address: "probe6@example.com" }

    expect(response).to have_http_status(:too_many_requests)
    expect(response.body).to include("Too many requests")
  end

  it "throttles repeated reset requests by email" do
    3.times do
      post passwords_path, params: { email_address: " Same@Example.com " }
      expect(response).to have_http_status(:redirect)
    end

    post passwords_path, params: { email_address: "same@example.com" }

    expect(response).to have_http_status(:too_many_requests)
  end
end

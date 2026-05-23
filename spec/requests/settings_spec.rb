require "rails_helper"

RSpec.describe "Settings", type: :request do
  def sign_in(user)
    post session_path, params: { email_address: user.email_address, password: "password" }
  end

  def json
    JSON.parse(response.body)
  end

  let(:user) { create(:user, :verified, name: "Taylor Rails", email_address: "taylor@example.com") }

  before { sign_in(user) }

  it "updates profile details without re-gating unchanged email addresses" do
    patch settings_profile_path,
      params: { user: { name: "Taylor Updated", email_address: " TAYLOR@example.com " } },
      as: :json

    expect(response).to have_http_status(:ok)
    expect(json.dig("user", "name")).to eq("Taylor Updated")
    expect(json.dig("user", "emailAddress")).to eq("taylor@example.com")
    expect(user.reload).to be_email_verified
  end

  it "sends a fresh verification email and ends the session when email changes" do
    session_id = user.sessions.last.id

    expect do
      patch settings_profile_path,
        params: { user: { name: "Taylor Rails", email_address: "new-taylor@example.com" } },
        as: :json
    end.to have_enqueued_mail(EmailVerificationMailer, :welcome)

    expect(response).to have_http_status(:ok)
    expect(json["redirect_to"]).to eq(sent_email_verifications_path)
    expect(user.reload.email_address).to eq("new-taylor@example.com")
    expect(user).not_to be_email_verified
    expect(user.email_verification_token_digest).to be_present
    expect(Session.exists?(session_id)).to be(false)

    get dashboard_path

    expect(response).to redirect_to(new_session_path)
  end
end

require "rails_helper"

RSpec.describe "Registrations", type: :request do
  let(:valid_params) do
    {
      user: {
        name: "Taylor Rails",
        email_address: "taylor@example.com",
        password: "password",
        password_confirmation: "password"
      }
    }
  end

  it "renders the signup form" do
    get new_registration_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Create your account")
  end

  it "creates an unverified user and enqueues signup emails" do
    expect do
      post registration_path, params: valid_params
    end.to change(User, :count).by(1)
      .and have_enqueued_mail(EmailVerificationMailer, :welcome)
      .and have_enqueued_mail(WelcomeMailer, :welcome)

    user = User.last
    expect(user.email_verified_at).to be_nil
    expect(user.email_verification_token_digest).to be_present
    expect(user.verification_sent_at).to be_present
    expect(response).to redirect_to(sent_email_verifications_path)
  end

  it "re-renders with validation errors for invalid input" do
    expect do
      post registration_path, params: { user: valid_params[:user].merge(email_address: "") }
    end.not_to change(User, :count)

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.body).to include("Fix the highlighted fields")
  end

  it "rejects duplicate email addresses" do
    create(:user, email_address: "taylor@example.com")

    expect do
      post registration_path, params: valid_params
    end.not_to change(User, :count)

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.body).to include("Email address has already been taken")
  end

  it "keeps signup usable if mail enqueueing raises" do
    allow(EmailVerificationMailer).to receive(:welcome).and_raise(StandardError, "mailer down")

    expect do
      post registration_path, params: valid_params
    end.to change(User, :count).by(1)

    expect(response).to redirect_to(sent_email_verifications_path)
  end
end

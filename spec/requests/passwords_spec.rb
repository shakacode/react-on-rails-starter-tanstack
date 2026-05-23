require "rails_helper"

RSpec.describe "Passwords", type: :request do
  it "sends reset instructions for normalized email input" do
    user = create(:user, email_address: "user@example.com")

    expect do
      post passwords_path, params: { email_address: " USER@Example.COM " }
    end.to have_enqueued_mail(PasswordsMailer, :reset).with(user)

    expect(response).to redirect_to(new_session_path)
  end

  it "resets a password with a generated token" do
    user = create(:user)
    token = user.password_reset_token

    patch password_path(token), params: { password: "new-password", password_confirmation: "new-password" }

    expect(response).to redirect_to(new_session_path)
    expect(user.reload.authenticate("new-password")).to eq(user)
  end
end

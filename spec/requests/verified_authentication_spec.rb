require "rails_helper"

RSpec.describe "Verified authentication gate", type: :request do
  it "redirects anonymous users to sign in" do
    get dashboard_path

    expect(response).to redirect_to(new_session_path)
  end

  it "redirects authenticated unverified users to the check-email page" do
    user = create(:user, :unverified)

    post session_path, params: { email_address: user.email_address, password: "password" }
    get dashboard_path

    expect(response).to redirect_to(sent_email_verifications_path)
  end

  it "allows verified users to reach the dashboard" do
    user = create(:user, :verified)

    post session_path, params: { email_address: user.email_address, password: "password" }
    get dashboard_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Dashboard")
  end
end

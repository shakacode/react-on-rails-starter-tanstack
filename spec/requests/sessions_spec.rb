require "rails_helper"

RSpec.describe "Sessions", type: :request do
  around do |example|
    original_allow_demo_seed = ENV["ALLOW_DEMO_SEED"]
    example.run
  ensure
    if original_allow_demo_seed.nil?
      ENV.delete("ALLOW_DEMO_SEED")
    else
      ENV["ALLOW_DEMO_SEED"] = original_allow_demo_seed
    end
  end

  def sign_in(user, password: "password")
    post session_path, params: { email_address: user.email_address, password: password }
  end

  it "shows the demo credentials hint when demo seeds are enabled" do
    get new_session_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include(DemoAccount::EMAIL_ADDRESS)
    expect(response.body).to include(DemoAccount::PASSWORD)
  end

  it "hides the demo credentials hint outside development and test without opt-in" do
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))
    ENV.delete("ALLOW_DEMO_SEED")

    get new_session_path

    expect(response).to have_http_status(:ok)
    expect(response.body).not_to include(DemoAccount::EMAIL_ADDRESS)
    expect(response.body).not_to include("Try it with")
    expect(response.body).to include("Use the account you created for this starter.")
  end

  it "signs in a verified user with the demo credentials contract" do
    user = create(:user, :verified, email_address: "demo@example.com", password: "password", password_confirmation: "password")

    expect do
      sign_in(user)
    end.to change { user.sessions.reload.count }.by(1)

    expect(response).to redirect_to(root_url)
    expect(flash[:alert]).to be_nil
  end

  it "sends an unverified signed-in user to the email verification gate" do
    user = create(:user, :unverified)

    expect do
      sign_in(user)
    end.to change { user.sessions.reload.count }.by(1)

    expect(response).to redirect_to(sent_email_verifications_path)
    expect(flash[:notice]).to eq("Check your email to finish verifying your account.")
  end

  it "redirects invalid credentials back to sign in without creating a session" do
    user = create(:user, :verified, email_address: "demo@example.com")

    expect do
      sign_in(user, password: "wrong-password")
    end.not_to change(Session, :count)

    expect(response).to redirect_to(new_session_path)
    expect(flash[:alert]).to eq("Try another email address or password.")
  end

  it "signs out by destroying the persisted session" do
    user = create(:user, :verified)
    sign_in(user)
    session_id = user.sessions.last.id

    delete session_path

    expect(response).to redirect_to(new_session_path)
    expect(response).to have_http_status(:see_other)
    expect(Session.exists?(session_id)).to be(false)
  end

  it "returns to the originally requested authenticated URL after sign in" do
    user = create(:user, :verified)

    get dashboard_path
    expect(response).to redirect_to(new_session_path)

    sign_in(user)

    expect(response).to redirect_to(dashboard_url)
  end
end

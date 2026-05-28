require "rails_helper"

RSpec.describe "Password reset to dashboard", type: :system do
  before do
    driven_by :rack_test
  end

  it "emails a reset link, saves a new password, and reaches the dashboard" do
    user = create(:user, :verified, email_address: "reset-flow@example.com", password: "old-password", password_confirmation: "old-password")
    old_session = create(:session, user: user)

    visit new_password_path
    fill_in "Email", with: user.email_address

    perform_enqueued_jobs do
      click_button "Email reset instructions"
    end

    mail = ActionMailer::Base.deliveries.find { |delivery| delivery.to.include?(user.email_address) }
    reset_url = URI.extract(mail.body.encoded).find { |url| url.include?("/passwords/") }

    visit reset_url
    fill_in "New password", with: "new-password"
    fill_in "Confirm new password", with: "new-password"
    click_button "Save password"

    expect(page).to have_current_path(dashboard_path)
    expect(page).to have_content("Dashboard")
    expect(user.reload.authenticate("new-password")).to eq(user)
    expect(Session.exists?(old_session.id)).to be(false)
    expect(user.sessions.count).to eq(1)
  end
end

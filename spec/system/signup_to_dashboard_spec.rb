require "rails_helper"

RSpec.describe "Signup to dashboard", type: :system do
  before do
    driven_by :rack_test
  end

  it "creates an account, verifies email, and reaches the dashboard" do
    visit new_registration_path

    fill_in "Name", with: "Taylor Rails"
    fill_in "Email", with: "taylor@example.com"
    fill_in "Password", with: "password"
    fill_in "Confirm password", with: "password"

    perform_enqueued_jobs do
      click_button "Create account"
    end

    expect(page).to have_content("Check your email")

    mail = ActionMailer::Base.deliveries.find { |delivery| delivery.to.include?("taylor@example.com") }
    verification_url = URI.extract(mail.body.encoded).find { |url| url.include?("/email_verifications/") }

    visit verification_url

    expect(page).to have_content("Your email is verified")
    expect(page).to have_content("Dashboard")
  end
end

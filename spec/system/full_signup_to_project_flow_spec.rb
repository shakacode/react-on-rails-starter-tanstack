require "rails_helper"

RSpec.describe "Full signup to project flow", type: :system do
  before do
    driven_by :rack_test
  end

  it "signs up, verifies email, and creates a project" do
    visit new_registration_path

    fill_in "Name", with: "Taylor Rails"
    fill_in "Email", with: "taylor-projects@example.com"
    fill_in "Password", with: "password"
    fill_in "Confirm password", with: "password"

    perform_enqueued_jobs do
      click_button "Create account"
    end

    mail = ActionMailer::Base.deliveries.find { |delivery| delivery.to.include?("taylor-projects@example.com") }
    verification_url = URI.extract(mail.body.encoded).find { |url| url.include?("/email_verifications/") }

    visit verification_url
    click_link "Projects"
    click_link "New project"

    click_button "Create project"
    expect(page).to have_content("Name can't be blank")

    fill_in "Name", with: "Customer Portal"
    fill_in "Description", with: "Build the first project CRUD path."
    select "Active", from: "Status"
    click_button "Create project"

    expect(page).to have_content("Project created")
    click_link "All projects"
    expect(page).to have_content("Customer Portal")
  end
end

class WelcomeMailerPreview < ActionMailer::Preview
  # REFERENCE PATTERN: mailer-preview - see AGENTS.md section 6
  def welcome
    WelcomeMailer.welcome(User.new(name: "Taylor Rails", email_address: "taylor@example.com"))
  end
end

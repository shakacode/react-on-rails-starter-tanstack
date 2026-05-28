class EmailVerificationMailerPreview < ActionMailer::Preview
  # REFERENCE PATTERN: mailer-preview — see AGENTS.md
  def welcome
    EmailVerificationMailer.welcome(preview_user, "preview-token")
  end

  private

    def preview_user
      User.new(name: "Taylor Rails", email_address: "taylor@example.com")
    end
end

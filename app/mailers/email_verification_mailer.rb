class EmailVerificationMailer < ApplicationMailer
  # REFERENCE PATTERN: mailer — see AGENTS.md §6
  def welcome(user, token)
    @user = user
    @verification_url = email_verification_url(token)

    mail to: @user.email_address, subject: "Verify your React on Rails Starter account"
  end
end

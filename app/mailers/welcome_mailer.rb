class WelcomeMailer < ApplicationMailer
  # REFERENCE PATTERN: mailer - see AGENTS.md section 6
  def welcome(user)
    @user = user

    mail to: @user.email_address, subject: "Welcome to React on Rails Starter"
  end
end

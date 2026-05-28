class RegistrationsController < ApplicationController
  # REFERENCE PATTERN: signup-controller — see AGENTS.md
  allow_unauthenticated_access only: %i[new create]

  def new
    @user = User.new(email_address: params[:email_address])
  end

  def create
    @user = User.new(registration_params)

    if @user.save
      token = @user.generate_email_verification_token!
      start_new_session_for(@user)
      session[:pending_verification_email] = @user.email_address
      deliver_signup_emails(@user, token)

      redirect_to sent_email_verifications_path, notice: "Check your email to finish verifying your account."
    else
      render :new, status: :unprocessable_content
    end
  end

  private

    def registration_params
      params.expect(user: %i[name email_address password password_confirmation])
    end

    def deliver_signup_emails(user, token)
      EmailVerificationMailer.welcome(user, token).deliver_later
      WelcomeMailer.welcome(user).deliver_later
    rescue StandardError => error
      Rails.logger.tagged("auth") do
        Rails.logger.error("signup_mail_enqueue_failed user_id=#{user.id} error=#{error.class}: #{error.message}")
      end
    end
end

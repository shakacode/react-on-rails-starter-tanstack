class EmailVerificationsController < ApplicationController
  allow_unauthenticated_access only: %i[create show sent expired]

  def create
    user = verification_request_user

    if user&.email_verified?
      Rails.logger.tagged("auth") { Rails.logger.info("email_verification_resend_already_verified user_id=#{user.id}") }
    elsif user
      token = user.generate_email_verification_token!
      EmailVerificationMailer.welcome(user, token).deliver_later
      session[:pending_verification_email] = user.email_address
      Rails.logger.tagged("auth") { Rails.logger.info("email_verification_resend user_id=#{user.id}") }
    else
      Rails.logger.tagged("auth") { Rails.logger.info("email_verification_resend_unknown") }
    end

    redirect_to sent_email_verifications_path,
                notice: "If that account exists and still needs verification, we sent a fresh link."
  end

  def show
    user = User.find_by_email_verification_token(params[:token])

    unless user
      Rails.logger.tagged("auth") { Rails.logger.info("email_verification_invalid") }
      return redirect_to expired_email_verifications_path
    end

    if user.email_verification_expired?
      Rails.logger.tagged("auth") { Rails.logger.info("email_verification_expired user_id=#{user.id}") }
      session[:pending_verification_email] = user.email_address
      return redirect_to expired_email_verifications_path
    end

    user.verify_email!
    rotate_session_for(user)
    Rails.logger.tagged("auth") { Rails.logger.info("email_verification_success user_id=#{user.id}") }

    redirect_to dashboard_path, notice: "Your email is verified."
  end

  def sent
    @masked_email_address = masked_pending_email
    @resend_cooldown_seconds = resend_cooldown_seconds
  end

  def expired
    @masked_email_address = masked_pending_email
  end

  private

    def verification_request_user
      email_address = params[:email_address].presence || Current.user&.email_address || session[:pending_verification_email]
      return if email_address.blank?

      User.find_by(email_address: email_address.to_s.strip.downcase)
    end

    def masked_pending_email
      email_address = Current.user&.email_address || session[:pending_verification_email]
      return "your email address" if email_address.blank?

      local, domain = email_address.to_s.split("@", 2)
      return email_address unless local.present? && domain.present?

      "#{local.first}#{'*' * [ local.length - 1, 1 ].max}@#{domain}"
    end

    def resend_cooldown_seconds
      sent_at = Current.user&.verification_sent_at || verification_request_user&.verification_sent_at
      return 0 unless sent_at

      [ (sent_at + 60.seconds - Time.current).ceil, 0 ].max
    end
end

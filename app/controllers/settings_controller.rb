class SettingsController < AuthenticatedController
  # REFERENCE PATTERN: settings-profile-controller — see AGENTS.md
  def update_profile
    email_changed = profile_params[:email_address].present? &&
      profile_params[:email_address].strip.downcase != Current.user.email_address

    if Current.user.update(profile_params)
      if email_changed
        token = Current.user.generate_email_verification_token!
        Current.user.update!(email_verified_at: nil)
        EmailVerificationMailer.welcome(Current.user, token).deliver_later
        session[:pending_verification_email] = Current.user.email_address
        terminate_session

        render json: { redirect_to: sent_email_verifications_path }
      else
        render json: { user: { name: Current.user.name, emailAddress: Current.user.email_address } }
      end
    else
      render json: { error: Current.user.errors.full_messages.to_sentence }, status: :unprocessable_content
    end
  end

  private

    def profile_params
      params.expect(user: %i[name email_address])
    end
end

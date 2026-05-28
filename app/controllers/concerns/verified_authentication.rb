module VerifiedAuthentication
  # REFERENCE PATTERN: verified-authentication — see AGENTS.md
  extend ActiveSupport::Concern

  included do
    before_action :require_verified_email
  end

  private

    def require_verified_email
      return if Current.user&.email_verified?

      session[:pending_verification_email] = Current.user&.email_address
      redirect_to sent_email_verifications_path, alert: "Verify your email before opening the dashboard."
    end
end

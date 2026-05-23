module Api
  class BaseController < AuthenticatedController
    private

      def request_authentication
        render json: { error: "Authentication required" }, status: :unauthorized
      end

      def require_verified_email
        return if Current.user&.email_verified?

        render json: { error: "Email verification required" }, status: :forbidden
      end
  end
end

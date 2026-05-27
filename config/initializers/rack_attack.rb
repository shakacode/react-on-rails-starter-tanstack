class Rack::Attack
  Rack::Attack.cache.store = Rails.env.test? ? ActiveSupport::Cache::MemoryStore.new : Rails.cache

  throttle("email verification sends by ip", limit: 5, period: 1.hour) do |request|
    request.ip if email_verification_send?(request)
  end

  throttle("email verification sends by email", limit: 3, period: 1.hour) do |request|
    normalized_email_param(request) if email_verification_send?(request)
  end

  throttle("password reset sends by ip", limit: 5, period: 1.hour) do |request|
    request.ip if password_reset_send?(request)
  end

  throttle("password reset sends by email", limit: 3, period: 1.hour) do |request|
    normalized_email_param(request) if password_reset_send?(request)
  end

  self.throttled_responder = lambda do |request|
    match_data = request.env["rack.attack.match_data"] || {}
    retry_after = match_data[:period].to_i
    minutes = [ (retry_after / 60.0).ceil, 1 ].max

    [
      429,
      {
        "Content-Type" => "text/plain",
        "Retry-After" => retry_after.to_s
      },
      [ "Too many requests. Try again in #{minutes} minutes." ]
    ]
  end

  def self.email_verification_send?(request)
    request.post? && request.path == "/email_verifications"
  end

  def self.password_reset_send?(request)
    request.post? && request.path == "/passwords"
  end

  def self.normalized_email_param(request)
    request.params["email_address"].to_s.strip.downcase.presence
  end
end

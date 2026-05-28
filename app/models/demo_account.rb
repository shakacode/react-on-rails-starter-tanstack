# frozen_string_literal: true

module DemoAccount
  EMAIL_ADDRESS = "demo@example.com"
  PASSWORD = "password"

  def self.seed_enabled?(rails_env: Rails.env, env: ENV)
    rails_env.development? || rails_env.test? || ActiveModel::Type::Boolean.new.cast(env["ALLOW_DEMO_SEED"]) == true
  end
end

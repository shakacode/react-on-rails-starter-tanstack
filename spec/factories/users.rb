FactoryBot.define do
  factory :user do
    sequence(:name) { |n| "User #{n}" }
    sequence(:email_address) { |n| "user#{n}@example.com" }
    password { "password" }
    password_confirmation { "password" }

    transient do
      verification_token { SecureRandom.urlsafe_base64(16) }
    end

    trait :unverified do
      email_verified_at { nil }

      after(:build) do |user, evaluator|
        user.email_verification_token_digest = User.digest_email_verification_token(evaluator.verification_token)
        user.verification_sent_at = Time.current
      end
    end

    trait :expired_token do
      email_verified_at { nil }

      after(:build) do |user, evaluator|
        user.email_verification_token_digest = User.digest_email_verification_token(evaluator.verification_token)
        user.verification_sent_at = 25.hours.ago
      end
    end

    trait :verified do
      email_verified_at { Time.current }
      email_verification_token_digest { nil }
      verification_sent_at { 1.hour.ago }
    end
  end
end

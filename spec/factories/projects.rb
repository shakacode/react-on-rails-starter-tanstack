FactoryBot.define do
  factory :project do
    user { association :user, :verified }
    sequence(:name) { |n| "Project #{n}" }
    description { "A project used by the starter specs." }
    status { :active }
    last_activity_at { Time.current }

    trait :active do
      status { :active }
    end

    trait :paused do
      status { :paused }
    end

    trait :completed do
      status { :completed }
    end

    trait :archived do
      status { :archived }
    end

    trait :stale do
      last_activity_at { 45.days.ago }
    end
  end
end

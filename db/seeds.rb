allow_demo_seed = Rails.env.development? || Rails.env.test? || ActiveModel::Type::Boolean.new.cast(ENV["ALLOW_DEMO_SEED"])

unless allow_demo_seed
  Rails.logger.info("Skipping demo seeds outside development/test. Set ALLOW_DEMO_SEED=true to seed the public demo account.")
else
  demo_user = User.find_or_initialize_by(email_address: "demo@example.com")
  demo_user.assign_attributes(
    name: "Demo User",
    password: "password",
    password_confirmation: "password",
    email_verified_at: Time.current,
    email_verification_token_digest: nil,
    verification_sent_at: 2.days.ago
  )
  demo_user.save!

  statuses = Project.statuses.keys

  12.times do |index|
    status = statuses[index % statuses.length]
    project = demo_user.projects.find_or_initialize_by(name: "Demo Project #{index + 1}")
    project.assign_attributes(
      description: "Sample #{status} project for the TanStack dashboard and table flows.",
      status: status,
      last_activity_at: (index + 1).days.ago
    )
    project.save!
  end

  puts "Seeded demo@example.com / password with #{demo_user.projects.count} projects."
end

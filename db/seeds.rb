unless DemoAccount.seed_enabled?
  Rails.logger.info("Skipping demo seeds outside development/test. Set ALLOW_DEMO_SEED=true to seed the public demo account.")
else
  demo_user = User.find_or_initialize_by(email_address: DemoAccount::EMAIL_ADDRESS)
  demo_user.assign_attributes(
    name: "Demo User",
    password: DemoAccount::PASSWORD,
    password_confirmation: DemoAccount::PASSWORD,
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
      created_at: (index + 14).days.ago,
      last_activity_at: (index + 1).days.ago
    )
    project.save!
  end

  puts "Seeded #{DemoAccount::EMAIL_ADDRESS} / #{DemoAccount::PASSWORD} with #{demo_user.projects.count} projects."
end

require "rails_helper"

RSpec.describe DemoAccount do
  around do |example|
    original_allow_demo_seed = ENV["ALLOW_DEMO_SEED"]
    example.run
  ensure
    if original_allow_demo_seed.nil?
      ENV.delete("ALLOW_DEMO_SEED")
    else
      ENV["ALLOW_DEMO_SEED"] = original_allow_demo_seed
    end
  end

  it "enables the demo account in development and test" do
    ENV.delete("ALLOW_DEMO_SEED")

    expect(described_class.seed_enabled?(rails_env: ActiveSupport::StringInquirer.new("development"))).to be(true)
    expect(described_class.seed_enabled?(rails_env: ActiveSupport::StringInquirer.new("test"))).to be(true)
  end

  it "requires explicit opt-in outside development and test" do
    production_env = ActiveSupport::StringInquirer.new("production")

    ENV.delete("ALLOW_DEMO_SEED")
    expect(described_class.seed_enabled?(rails_env: production_env)).to be(false)

    ENV["ALLOW_DEMO_SEED"] = "true"
    expect(described_class.seed_enabled?(rails_env: production_env)).to be(true)
  end
end

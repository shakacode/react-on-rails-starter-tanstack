require "rails_helper"

RSpec.describe "db/seeds" do
  def load_seeds
    load Rails.root.join("db/seeds.rb")
  end

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

  it "creates the verified demo user and sample projects idempotently" do
    load_seeds
    load_seeds

    demo_user = User.find_by!(email_address: DemoAccount::EMAIL_ADDRESS)

    expect(demo_user.name).to eq("Demo User")
    expect(demo_user).to be_email_verified
    expect(demo_user.authenticate(DemoAccount::PASSWORD)).to eq(demo_user)
    expect(demo_user.projects.count).to eq(12)
    expect(demo_user.projects.distinct.count(:name)).to eq(12)
  end

  it "skips demo seeds outside development and test by default" do
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))
    ENV.delete("ALLOW_DEMO_SEED")

    expect { load_seeds }.not_to change(User, :count)
  end

  it "allows explicit demo seeding outside development and test" do
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))
    ENV["ALLOW_DEMO_SEED"] = "true"

    expect { load_seeds }.to change { User.where(email_address: DemoAccount::EMAIL_ADDRESS).count }.from(0).to(1)
  end
end

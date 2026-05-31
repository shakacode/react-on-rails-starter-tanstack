# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Deployment revision", type: :request do
  let(:sha) { "fedcba9876543210fedcba9876543210fedcba98" }

  around do |example|
    original_env = ENV.to_hash
    BuildMetadata::COMMIT_ENV_KEYS.each { |key| ENV.delete(key) }
    ENV["GIT_COMMIT"] = sha
    BuildMetadata.reset!

    example.run
  ensure
    BuildMetadata.reset!
    ENV.replace(original_env)
  end

  it "renders the deployed commit in the shared Rails footer" do
    get root_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Commit")
    expect(response.body).to include("fedcba9")
    expect(response.body).to include("#{ApplicationHelper::GITHUB_REPO_URL}/commit/#{sha}")
  end

  it "passes the deployed commit into the TanStack dashboard shell" do
    user = create(:user, :verified)
    post session_path, params: { email_address: user.email_address, password: "password" }

    get dashboard_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("TANSTACK_SSR_SHELL")
    expect(response.body).to include("fedcba9")
    expect(response.body).to include("#{ApplicationHelper::GITHUB_REPO_URL}/commit/#{sha}")
  end

  it "passes the deployed commit into the public RSC showcase shell" do
    get rsc_showcase_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("fedcba9")
    expect(response.body).to include("#{ApplicationHelper::GITHUB_REPO_URL}/commit/#{sha}")
  end

  it "renders the deployed commit in the lower-level RSC demo footer" do
    allow_any_instance_of(HelloServerController) # rubocop:disable RSpec/AnyInstance
      .to receive(:rsc_client_references_available?).and_return(false)

    get hello_server_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Commit")
    expect(response.body).to include("fedcba9")
    expect(response.body).to include("#{ApplicationHelper::GITHUB_REPO_URL}/commit/#{sha}")
  end
end

# frozen_string_literal: true

require "rails_helper"

RSpec.describe BuildMetadata do
  around do |example|
    original_env = ENV.to_hash
    described_class::COMMIT_ENV_KEYS.each { |key| ENV.delete(key) }
    described_class.reset!

    example.run
  ensure
    described_class.reset!
    ENV.replace(original_env)
  end

  it "prefers the cpflow GIT_COMMIT build metadata" do
    sha = "1234567890abcdef1234567890abcdef12345678"
    ENV["GIT_COMMIT"] = sha

    expect(described_class.commit_sha).to eq(sha)
    expect(described_class.short_commit_sha).to eq("1234567")
    expect(described_class.commit_url).to eq("#{ApplicationHelper::GITHUB_REPO_URL}/commit/#{sha}")
  end

  it "falls back to the local git checkout outside the deployed image" do
    allow(described_class).to receive(:local_git_commit_sha).and_return("abcdef1234567890")

    expect(described_class.commit_sha).to eq("abcdef1234567890")
    expect(described_class.short_commit_sha).to eq("abcdef1")
  end

  it "ignores non-SHA revision labels" do
    ENV["GIT_COMMIT"] = "manual-build"
    allow(described_class).to receive(:local_git_commit_sha).and_return(nil)

    expect(described_class.commit_sha).to be_nil
    expect(described_class.short_commit_sha).to be_nil
    expect(described_class.commit_url).to be_nil
  end
end

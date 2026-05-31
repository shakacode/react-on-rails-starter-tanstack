# frozen_string_literal: true

require "open3"

module BuildMetadata
  COMMIT_ENV_KEYS = %w[
    GIT_COMMIT
    SOURCE_VERSION
    HEROKU_SLUG_COMMIT
    RENDER_GIT_COMMIT
    VERCEL_GIT_COMMIT_SHA
  ].freeze
  COMMIT_SHA_PATTERN = /\A[0-9a-f]{7,40}\z/i

  module_function

  def commit_sha
    return @commit_sha if instance_variable_defined?(:@commit_sha)

    @commit_sha = env_commit_sha || local_git_commit_sha
  end

  def short_commit_sha
    commit_sha&.first(7)
  end

  def commit_url
    sha = commit_sha
    return unless sha&.match?(COMMIT_SHA_PATTERN)

    "#{github_repo_url}/commit/#{sha}"
  end

  def env_commit_sha
    COMMIT_ENV_KEYS.filter_map { |key| valid_commit_sha(ENV[key].presence) }.first
  end

  def local_git_commit_sha
    return unless Rails.root.join(".git").exist?

    stdout, status = Open3.capture2("git", "-C", Rails.root.to_s, "rev-parse", "HEAD")
    return unless status.success?

    valid_commit_sha(stdout.strip.presence)
  rescue Errno::ENOENT, StandardError
    nil
  end

  def github_repo_url
    ApplicationHelper::GITHUB_REPO_URL
  end

  def valid_commit_sha(value)
    return unless value&.match?(COMMIT_SHA_PATTERN)

    value
  end

  def reset!
    remove_instance_variable(:@commit_sha) if instance_variable_defined?(:@commit_sha)
  end
end

# frozen_string_literal: true

module ApplicationHelper
  GITHUB_REPO_URL = "https://github.com/shakacode/react-on-rails-starter-tanstack"
  GITHUB_DEFAULT_BRANCH = "main"
  SHAKACODE_URL = "https://www.shakacode.com"

  def demo_credentials_hint_enabled?
    DemoAccount.seed_enabled?
  end

  def demo_account_email
    DemoAccount::EMAIL_ADDRESS
  end

  def demo_account_password
    DemoAccount::PASSWORD
  end

  def github_repo_url
    GITHUB_REPO_URL
  end

  def shakacode_url
    SHAKACODE_URL
  end

  # Link a repository-relative path to GitHub. Paths ending in "/" point at a
  # directory tree; everything else points at the file blob on the default branch.
  def github_source_url(path)
    clean = path.to_s.delete_prefix("/")
    kind = clean.end_with?("/") ? "tree" : "blob"
    "#{GITHUB_REPO_URL}/#{kind}/#{GITHUB_DEFAULT_BRANCH}/#{clean.chomp('/')}"
  end

  # Google PageSpeed Insights analysis URL for an arbitrary target URL. Used so the
  # landing page can say "measure it yourself" against the very page being viewed.
  def pagespeed_url(target_url)
    "https://pagespeed.web.dev/analysis?url=#{CGI.escape(target_url.to_s)}"
  end
end

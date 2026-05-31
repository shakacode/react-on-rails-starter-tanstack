class ApplicationController < ActionController::Base
  include Authentication

  helper_method :deployed_commit_sha, :deployed_commit_short_sha, :deployed_commit_url

  protect_from_forgery with: :exception

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  private

  def deployed_commit_sha
    BuildMetadata.commit_sha
  end

  def deployed_commit_short_sha
    BuildMetadata.short_commit_sha
  end

  def deployed_commit_url
    BuildMetadata.commit_url
  end
end

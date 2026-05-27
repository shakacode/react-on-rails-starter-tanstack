# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Content Security Policy", type: :request do
  def csp_header
    response.headers.fetch("Content-Security-Policy")
  end

  def expect_baseline_csp
    aggregate_failures do
      expect(csp_header).to include("default-src 'self'")
      expect(csp_header).to include("base-uri 'self'")
      expect(csp_header).to include("connect-src 'self'")
      expect(csp_header).to include("form-action 'self'")
      expect(csp_header).to include("frame-ancestors 'self'")
      expect(csp_header).to include("object-src 'none'")
      expect(csp_header).to include("style-src 'self' 'unsafe-inline'")
      expect(csp_header).to match(/script-src[^;]*'self'[^;]*'nonce-[^']+'/)
    end
  end

  it "enforces the baseline policy on the public Rails layout" do
    get root_path

    expect(response).to have_http_status(:ok)
    expect_baseline_csp
    expect(response.body).to include('name="csp-nonce"')
  end

  it "enforces the baseline policy on authenticated TanStack full-page loads" do
    user = create(:user, :verified)

    post session_path, params: { email_address: user.email_address, password: "password" }
    get dashboard_path

    expect(response).to have_http_status(:ok)
    expect_baseline_csp
    expect(response.body).to include('name="csp-nonce"')
  end

  it "wires the React on Rails Pro streaming layout for CSP nonce meta tags" do
    layout = Rails.root.join("app/views/layouts/react_on_rails_default.html.erb").read

    expect(layout).to include("<%= csp_meta_tag %>")
  end
end

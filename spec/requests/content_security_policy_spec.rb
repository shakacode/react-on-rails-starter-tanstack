# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Content Security Policy", type: :request do
  def streaming_component_script_for_csp
    helper_class = Class.new(ActionView::Base) do
      include ReactOnRails::Helper
      include ReactOnRails::ProHelper

      def content_security_policy_nonce(*) = "streaming-test-nonce"
    end
    render_options = ReactOnRails::ReactComponent::RenderOptions.new(
      react_component_name: "HelloServer",
      options: {
        id: "HelloServer-react-component-1",
        props: { name: "React on Rails Pro" },
        render_mode: :html_streaming,
        store_dependencies: nil,
        trace: false
      }
    )
    helper = helper_class.with_empty_template_cache.new(ActionView::LookupContext.new([]), {}, nil)

    helper.generate_component_script(render_options)
  end

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

  it "keeps the React on Rails Pro streaming force-load script nonce-compatible" do
    html = streaming_component_script_for_csp

    expect(html).to include('nonce="streaming-test-nonce"')
    expect(html).to include("ReactOnRails.reactOnRailsComponentLoaded('HelloServer-react-component-1')")
  end
end

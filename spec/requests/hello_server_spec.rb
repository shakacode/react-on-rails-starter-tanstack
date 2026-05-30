# frozen_string_literal: true

require "rails_helper"

# The /hello_server route demonstrates React Server Components. Its interactive client
# island depends on the RSC client/server manifests, which the current Rspack build does
# not emit (a documented AMBER limitation, see SPIKE.md). When the manifests are missing
# the controller must degrade to an honest, server-rendered fallback rather than streaming
# into a 500 that reads as broken to a visitor.
RSpec.describe "HelloServer RSC route", type: :request do
  def parsed_response
    Nokogiri::HTML(response.body)
  end

  context "when the RSC client-reference manifests are missing (Rspack limitation)" do
    before do
      allow_any_instance_of(HelloServerController) # rubocop:disable RSpec/AnyInstance
        .to receive(:rsc_client_references_available?).and_return(false)
    end

    it "returns a successful, non-blank page instead of a 500" do
      get hello_server_path

      expect(response).to have_http_status(:ok)
      # The shared demo shell stays intact so the page never looks broken.
      expect(response.body).to include("React Server Components Demo")
    end

    it "explains the limitation honestly and links to SPIKE.md" do
      get hello_server_path

      body = response.body
      expect(body).to include("Known Rspack limitation")
      expect(body).to include("interactive island is not live")
      spike_link = parsed_response.at_css("[data-rsc-fallback] a[href*='SPIKE.md']")
      expect(spike_link).not_to be_nil
      expect(spike_link["href"]).to include("github.com/shakacode/react-on-rails-starter-tanstack")
    end

    it "does not attempt to render the interactive client island" do
      get hello_server_path

      # The client component placeholder is only emitted by the streaming island,
      # which the fallback intentionally skips.
      expect(response.body).not_to include("HelloServer-react-component")
    end
  end
end

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

  describe "manifest availability checks" do
    let(:client_manifest_url) { "http://localhost:3035/packs/react-client-manifest.json" }
    let(:server_manifest_path) { Rails.root.join("tmp/test-react-server-client-manifest.json").to_s }

    before do
      File.write(server_manifest_path, "{}")
      allow(ReactOnRailsPro::Utils).to receive(:react_client_manifest_file_path).and_return(client_manifest_url)
      allow(ReactOnRailsPro::Utils).to receive(:react_server_client_manifest_file_path).and_return(server_manifest_path)
    end

    after do
      FileUtils.rm_f(server_manifest_path)
    end

    def http_response(response_class, code, message, body)
      response_class.new("1.1", code, message).tap do |response|
        response.instance_variable_set(:@body, body)
        response.instance_variable_set(:@read, true)
      end
    end

    def stub_rsc_stream_response(body = "streamed rsc")
      allow_any_instance_of(HelloServerController) # rubocop:disable RSpec/AnyInstance
        .to receive(:stream_view_containing_react_components) do |controller, **_options|
          controller.render(plain: body)
        end
    end

    it "accepts dev-server manifest URLs that return successfully" do
      http = instance_double(Net::HTTP)
      manifest_response = http_response(Net::HTTPOK, "200", "OK", "{}")
      allow(Net::HTTP).to receive(:start) { |_host, _port, **_options, &block| block.call(http) }
      allow(http).to receive(:request).with(instance_of(Net::HTTP::Get)).and_return(manifest_response)
      stub_rsc_stream_response

      get hello_server_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to eq("streamed rsc")
    end

    it "rejects successful dev-server fallback responses that are not JSON" do
      http = instance_double(Net::HTTP)
      manifest_response = http_response(Net::HTTPOK, "200", "OK", "<!doctype html>")
      allow(Net::HTTP).to receive(:start) { |_host, _port, **_options, &block| block.call(http) }
      allow(http).to receive(:request).with(instance_of(Net::HTTP::Get)).and_return(manifest_response)

      get hello_server_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Known Rspack limitation")
    end

    it "treats missing dev-server manifest URLs as unavailable" do
      http = instance_double(Net::HTTP)
      manifest_response = http_response(Net::HTTPNotFound, "404", "Not Found", "")
      allow(Net::HTTP).to receive(:start) { |_host, _port, **_options, &block| block.call(http) }
      allow(http).to receive(:request).with(instance_of(Net::HTTP::Get)).and_return(manifest_response)

      get hello_server_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Known Rspack limitation")
    end
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

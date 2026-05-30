require "rails_helper"

RSpec.describe "Global site chrome", type: :request do
  def parsed_response
    Nokogiri::HTML(response.body)
  end

  def footer_links_to_repo?
    parsed_response.css("footer a[href*='github.com/shakacode/react-on-rails-starter-tanstack']").any?
  end

  describe "non-chrome surfaces (auth + classic CRUD)" do
    it "renders the shared header and footer on the sign-in page" do
      get new_session_path

      expect(response).to have_http_status(:ok)
      # The global header links its brand mark back to the root path.
      expect(parsed_response.css("header.sticky a[href='#{root_path}']")).not_to be_empty
      expect(footer_links_to_repo?).to be(true)
      expect(response.body).to include("MIT licensed")
      expect(response.body).to include("shakacode.com")
    end

    it "renders the shared header and footer on the classic Rails CRUD index" do
      user = create(:user, :verified)
      post session_path, params: { email_address: user.email_address, password: "password" }

      get classic_projects_path

      expect(response).to have_http_status(:ok)
      expect(footer_links_to_repo?).to be(true)
      expect(response.body).to include("MIT licensed")
    end

    it "keeps the global header slim by omitting the landing-only section nav" do
      get new_session_path

      expect(parsed_response.css("header a[href='#rsc']")).to be_empty
    end
  end

  describe "opted-out surfaces" do
    it "does not double up chrome on the landing page" do
      get root_path

      expect(response).to have_http_status(:ok)
      # The landing renders its own inline header/footer, so there must be exactly one each
      # (no duplicate global chrome layered on top).
      expect(parsed_response.css("header.sticky").count).to eq(1)
      expect(parsed_response.css("footer").count).to eq(1)
      # The landing header keeps its in-page section nav.
      expect(parsed_response.css("header a[href='#rsc']")).not_to be_empty
    end

    it "does not wrap the TanStack dashboard in global chrome" do
      user = create(:user, :verified)
      post session_path, params: { email_address: user.email_address, password: "password" }

      get dashboard_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("TANSTACK_SSR_SHELL")
      expect(parsed_response.css("footer")).to be_empty
    end
  end
end

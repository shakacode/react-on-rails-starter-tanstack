# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Health endpoint", type: :request do
  it "responds successfully" do
    get rails_health_check_path

    expect(response).to have_http_status(:ok)
  end
end

RSpec.describe "Public page accessibility", type: :request do
  def parsed_response
    Nokogiri::HTML(response.body)
  end

  it "sets the document language and main landmark on the landing page" do
    get root_path

    expect(response).to have_http_status(:ok)
    expect(parsed_response.at_css("html")["lang"]).to eq("en")
    expect(parsed_response.css("main").count).to eq(1)
  end

  it "sets the document language on the sign-in page" do
    get new_session_path

    expect(response).to have_http_status(:ok)
    expect(parsed_response.at_css("html")["lang"]).to eq("en")
  end
end

RSpec.describe "Landing page", type: :request do
  def parsed_response
    Nokogiri::HTML(response.body)
  end

  it "surfaces the RSC and TanStack positioning, source repo, and ShakaCode" do
    get root_path

    expect(response).to have_http_status(:ok)
    body = response.body
    expect(body).to include("React Server Components on Rails")
    expect(body).to include("TanStack Router", "TanStack Query", "TanStack Table")
    expect(body).to include("React on Rails + TanStack vs Inertia")
    expect(body).to include("github.com/shakacode/react-on-rails-starter-tanstack")
    expect(body).to include("shakacode.com")
  end

  it "links live surfaces and source files from the landing page" do
    get root_path

    expect(parsed_response.css("a[href='#{hello_server_path}']")).not_to be_empty
    expect(parsed_response.css("a[href='#{dashboard_path}']")).not_to be_empty
    # Generated-file references point at the GitHub blob, not bare code text.
    expect(parsed_response.css("a[href*='github.com/shakacode/react-on-rails-starter-tanstack/blob/main']")).not_to be_empty
  end

  it "does not ship the old Rails-vs-React comparison island" do
    get root_path

    expect(response.body).not_to include("Same data. Two front-ends.")
    expect(response.body).not_to include("ComparisonTable")
    expect(parsed_response.css('[data-testid="rails-panel-table"]')).to be_empty
  end
end

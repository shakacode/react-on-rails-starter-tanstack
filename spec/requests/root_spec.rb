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

  # Names visible in the server-rendered "classic Rails" comparison panel only.
  def rails_panel_names
    parsed_response.css('[data-testid="rails-panel-table"] tbody tr td:first-child').map { |td| td.text.strip }
  end

  it "surfaces the TanStack stack, source repo, and ShakaCode" do
    get root_path

    expect(response).to have_http_status(:ok)
    body = response.body
    expect(body).to include("TanStack Router", "TanStack Query", "TanStack Table")
    expect(body).to include("github.com/shakacode/react-on-rails-starter-tanstack")
    expect(body).to include("shakacode.com")
  end

  it "mounts the TanStack comparison island and links source to GitHub" do
    get root_path

    expect(response.body).to include("ComparisonTable")
    # Generated-file references point at the GitHub blob, not bare code text.
    expect(parsed_response.css("a[href*='github.com/shakacode/react-on-rails-starter-tanstack/blob/main']")).not_to be_empty
  end

  it "filters the Rails comparison panel on the server" do
    get root_path, params: { q: "Aurora" }

    expect(rails_panel_names).to eq([ "Aurora Analytics" ])
  end

  it "sorts the Rails comparison panel ascending by name on the server" do
    get root_path, params: { sort: "name", dir: "asc" }

    names = rails_panel_names
    expect(names).to eq(names.sort)
    expect(names.first).to eq("Aurora Analytics")
  end

  it "reverses sort order when dir is desc" do
    get root_path, params: { sort: "name", dir: "desc" }

    names = rails_panel_names
    expect(names).to eq(names.sort.reverse)
  end

  it "paginates the Rails comparison panel" do
    get root_path, params: { page: 1 }
    page_one = rails_panel_names

    get root_path, params: { page: 2 }
    page_two = rails_panel_names

    expect(page_one).not_to be_empty
    expect(page_two).not_to be_empty
    expect(page_one & page_two).to be_empty
  end
end

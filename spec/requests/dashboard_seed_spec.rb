require "rails_helper"

# Covers the `ssr-query-hydration` pattern from the Rails side: DashboardController#show
# embeds an `initialProjects` seed in the TanStack shell so the projects table can render
# its first page without a client round-trip. (prerender is off in test env, so we assert
# on the serialized props, not on SSR'd HTML — see the PR notes.)
RSpec.describe "Dashboard projects SSR seed", type: :request do
  def sign_in(user)
    post session_path, params: { email_address: user.email_address, password: "password" }
  end

  def json
    JSON.parse(response.body)
  end

  let(:user) { create(:user, :verified) }

  before { sign_in(user) }

  it "embeds an initialProjects seed in the shell consistent with the JSON API" do
    create(:project, user:, name: "Seeded Project", last_activity_at: 1.hour.ago)

    get api_projects_path
    expect(response).to have_http_status(:ok)
    expect(json["projects"].first["name"]).to eq("Seeded Project")
    expect(json["meta"]).to include("page" => 1)

    get projects_path # Rails route that renders the TanStack dashboard shell
    expect(response).to have_http_status(:ok)
    expect(response.body).to include("TANSTACK_SSR_SHELL")
    expect(response.body).to include('"initialProjects"')
    expect(response.body).to include("Seeded Project")
  end

  it "scopes the seed to the current user" do
    create(:project, name: "Other user project")

    get projects_path

    expect(response).to have_http_status(:ok)
    expect(response.body).not_to include("Other user project")
  end
end

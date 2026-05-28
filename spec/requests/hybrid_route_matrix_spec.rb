require "rails_helper"

RSpec.describe "Hybrid Rails and TanStack route matrix", type: :request do
  def sign_in(user)
    post session_path, params: { email_address: user.email_address, password: "password" }
  end

  let(:user) { create(:user, :verified) }
  let(:project) { create(:project, user:) }

  before { sign_in(user) }

  it "serves the TanStack dashboard shell for Rails-owned dashboard full-page loads" do
    tanstack_routes = {
      "/dashboard" => dashboard_path,
      "/settings" => settings_path,
      "/settings/profile" => settings_profile_path,
      "/settings/security" => settings_security_path,
      "/projects" => projects_path,
      "/projects/new" => new_project_path,
      "/projects/:id" => project_path(project),
      "/projects/:id/edit" => edit_project_path(project)
    }

    tanstack_routes.each do |label, path|
      get path

      aggregate_failures(label) do
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("TANSTACK_SSR_SHELL")
        expect(response.body).to include('id="DashboardApp"')
        expect(response.body).to include('"initialPath":"')
      end
    end
  end

  it "keeps the classic projects index on the Rails CRUD surface" do
    create(:project, user:, name: "Classic matrix project")

    get classic_projects_path

    expect(response).to have_http_status(:ok)
    expect(response.body).to include("Server-rendered CRUD reference path")
    expect(response.body).to include("Classic matrix project")
    expect(response.body).not_to include("TANSTACK_SSR_SHELL")
    expect(response.body).not_to include('id="DashboardApp"')
  end
end

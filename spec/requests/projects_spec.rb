require "rails_helper"

RSpec.describe "Projects", type: :request do
  def sign_in(user)
    post session_path, params: { email_address: user.email_address, password: "password" }
  end

  def json
    JSON.parse(response.body)
  end

  describe "HTML CRUD" do
    let(:user) { create(:user, :verified) }

    before { sign_in(user) }

    it "lists projects for the current user only" do
      create(:project, user: user, name: "Mine")
      create(:project, name: "Not mine")

      get classic_projects_path

      expect(response).to have_http_status(:ok)
      expect(response.body).to include("Mine")
      expect(response.body).not_to include("Not mine")
    end

    it "creates a project after showing inline validation errors" do
      get new_classic_project_path
      expect(response).to have_http_status(:ok)

      post classic_projects_path, params: { project: { name: "", description: "Missing name", status: "active" } }
      expect(response).to have_http_status(:unprocessable_content)
      expect(CGI.unescapeHTML(response.body)).to include("Name can't be blank")

      expect do
        post classic_projects_path,
          params: { project: { name: "Launch plan", description: "Phase 3", status: "active" } }
      end.to change(user.projects, :count).by(1)

      expect(response).to redirect_to(classic_project_path(user.projects.last))
    end

    it "updates a project" do
      project = create(:project, user: user)

      patch classic_project_path(project),
        params: { project: { name: "Updated", description: "Changed", status: "paused" } }

      expect(response).to redirect_to(classic_project_path(project))
      expect(project.reload.name).to eq("Updated")
      expect(project).to be_paused
    end

    it "archives instead of deleting" do
      project = create(:project, user: user)

      expect do
        delete classic_project_path(project)
      end.not_to change(Project, :count)

      expect(response).to redirect_to(classic_projects_path)
      expect(project.reload).to be_archived
    end

    it "returns 404 when a user tries another user's project" do
      other_project = create(:project)

      get classic_project_path(other_project)

      expect(response).to have_http_status(:not_found)
    end

    it "serves the TanStack shell for project deep links" do
      project = create(:project, user: user)

      [
        projects_path,
        new_project_path,
        project_path(project),
        edit_project_path(project)
      ].each do |path|
        get path

        expect(response).to have_http_status(:ok)
        expect(response.body).to include("TANSTACK_SSR_SHELL")
      end
    end
  end

  describe "JSON API" do
    let(:user) { create(:user, :verified) }

    it "requires authentication" do
      get api_projects_path

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to eq("Authentication required")
    end

    it "requires a verified email" do
      unverified = create(:user, :unverified)
      sign_in(unverified)

      get api_projects_path

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]).to eq("Email verification required")
    end

    it "filters and sorts projects for the current user" do
      sign_in(user)
      active = create(:project, :active, user: user, name: "Active", last_activity_at: 1.hour.ago)
      create(:project, :paused, user: user, name: "Paused", last_activity_at: 1.day.ago)
      other = create(:project, :active, name: "Other user", last_activity_at: Time.current)

      get api_projects_path, params: { status: "active", sort: "last_activity_at", dir: "desc" }

      expect(response).to have_http_status(:ok)
      expect(json["projects"].map { |project| project["id"] }).to eq([ active.id ])
      expect(json["projects"].map { |project| project["id"] }).not_to include(other.id)
    end

    it "ignores unsupported status filters without dispatching them as methods" do
      sign_in(user)
      active = create(:project, :active, user: user)
      paused = create(:project, :paused, user: user)

      get api_projects_path, params: { status: "destroy_all", sort: "created_at", dir: "asc" }

      expect(response).to have_http_status(:ok)
      expect(json["projects"].map { |project| project["id"] }).to contain_exactly(active.id, paused.id)
    end

    it "returns paginated projects and metadata for the current user" do
      sign_in(user)
      create(:project, user: user, name: "Alpha")
      create(:project, user: user, name: "Bravo")
      create(:project, user: user, name: "Charlie")
      create(:project, name: "Other user")

      get api_projects_path, params: { sort: "name", dir: "asc", page: 2, per_page: 2 }

      expect(response).to have_http_status(:ok)
      expect(json["projects"].map { |project| project["name"] }).to eq([ "Charlie" ])
      expect(json["meta"]).to eq(
        "page" => 2,
        "per_page" => 2,
        "total" => 3
      )
    end

    it "clamps pagination params to the supported bounds" do
      sign_in(user)
      create(:project, user: user, name: "Alpha")
      create(:project, user: user, name: "Bravo")

      get api_projects_path, params: { sort: "name", dir: "asc", page: -10, per_page: -5 }

      expect(response).to have_http_status(:ok)
      expect(json["projects"].map { |project| project["name"] }).to eq([ "Alpha" ])
      expect(json["meta"]).to include("page" => 1, "per_page" => 1, "total" => 2)

      get api_projects_path, params: { sort: "name", dir: "asc", page: 0, per_page: 100 }

      expect(response).to have_http_status(:ok)
      expect(json["projects"].map { |project| project["name"] }).to eq([ "Alpha", "Bravo" ])
      expect(json["meta"]).to include("page" => 1, "per_page" => 50, "total" => 2)
    end

    it "shows a single project scoped to the current user" do
      sign_in(user)
      project = create(:project, user: user)

      get api_project_path(project)

      expect(response).to have_http_status(:ok)
      expect(json.dig("project", "id")).to eq(project.id)
    end

    it "returns 404 for another user's project" do
      sign_in(user)
      project = create(:project)

      get api_project_path(project)

      expect(response).to have_http_status(:not_found)
      expect(json["error"]).to eq("Project not found")
    end

    it "creates a project through the JSON API" do
      sign_in(user)

      expect do
        post api_projects_path,
          params: { project: { name: "Client route", description: "Created from TanStack", status: "active" } },
          as: :json
      end.to change(user.projects, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json.dig("project", "name")).to eq("Client route")
      expect(json.dig("project", "status")).to eq("active")
    end

    it "returns validation errors for JSON API creates" do
      sign_in(user)

      post api_projects_path, params: { project: { name: "", status: "active" } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to include("Name can't be blank")
      expect(json.dig("errors", "name")).to include("Name can't be blank")
    end

    it "updates a project through the JSON API" do
      sign_in(user)
      project = create(:project, user: user, status: "active")

      patch api_project_path(project),
        params: { project: { name: "Updated from client", description: "Changed", status: "paused" } },
        as: :json

      expect(response).to have_http_status(:ok)
      expect(json.dig("project", "name")).to eq("Updated from client")
      expect(project.reload).to be_paused
    end

    it "returns 404 for another user's metrics endpoint" do
      sign_in(user)
      project = create(:project)

      get metrics_api_project_path(project)

      expect(response).to have_http_status(:not_found)
      expect(json["error"]).to eq("Project not found")
    end

    it "returns dashboard metrics" do
      sign_in(user)
      project = create(:project, user: user)
      create(:project, :completed, user: user, created_at: 4.days.ago, last_activity_at: 1.day.ago, updated_at: 2.days.ago)
      create(:project, :completed, user: user, created_at: 1.day.ago, last_activity_at: 2.days.ago, updated_at: 2.days.ago)

      get metrics_api_project_path(project)

      expect(response).to have_http_status(:ok)
      expect(json.keys).to contain_exactly("total", "active_count", "completed_this_week", "avg_cycle_time")
      expect(json["total"]).to eq(3)
      expect(json["active_count"]).to eq(1)
      expect(json["completed_this_week"]).to eq(2)
      expect(json["avg_cycle_time"]).to eq(1.5)
    end
  end
end

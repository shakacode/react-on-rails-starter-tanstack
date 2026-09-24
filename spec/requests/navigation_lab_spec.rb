require "rails_helper"

RSpec.describe "Instant Navigation Lab routes", type: :request do
  def sign_in(user)
    post session_path, params: { email_address: user.email_address, password: "password" }
  end

  let(:user) { create(:user, :verified) }
  let(:project) { create(:project, user:) }

  it "serves the TanStack dashboard shell for direct lab URLs with the Rails path handoff" do
    sign_in(user)

    {
      navigation_lab_path => "/navigation-lab",
      navigation_lab_project_path(project) => "/navigation-lab/projects/#{project.id}"
    }.each do |path, expected_path|
      get path

      aggregate_failures(path) do
        expect(response).to have_http_status(:ok)
        expect(response.body).to include("TANSTACK_SSR_SHELL")
        expect(response.body).to include(%("initialPath":"#{expected_path}"))
      end
    end
  end

  it "redirects anonymous lab deep links to sign in" do
    get navigation_lab_project_path(project)

    expect(response).to redirect_to(new_session_path)
  end

  it "redirects unverified users away from the lab" do
    sign_in(create(:user, :unverified))

    get navigation_lab_path

    expect(response).to redirect_to(sent_email_verifications_path)
  end

  it "ships no project data in the lab shell and scopes lab JSON reads to the signed-in user" do
    other_project = create(:project, user: create(:user, :verified))
    sign_in(user)

    get navigation_lab_project_path(other_project)
    expect(response).to have_http_status(:ok)
    expect(response.body).to include('"initialProjects":null')

    get api_project_path(other_project), as: :json
    expect(response).to have_http_status(:not_found)
  end
end

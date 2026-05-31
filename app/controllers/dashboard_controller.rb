class DashboardController < AuthenticatedController
  # REFERENCE PATTERN: dashboard-props-controller — see AGENTS.md
  def show
    @dashboard_props = {
      initialPath: request.path,
      initialSearch: request.query_string.present? ? "?#{request.query_string}" : "",
      user: {
        name: Current.user.name,
        emailAddress: Current.user.email_address
      },
      api: {
        projectsPath: api_projects_path,
        metricsProjectId: Current.user.projects.recent.first&.id
      },
      links: {
        dashboard: dashboard_path,
        settings: settings_path,
        projects: projects_path,
        newProject: new_project_path,
        classicProjects: classic_projects_path,
        signOut: session_path
      },
      build: {
        commitSha: deployed_commit_sha,
        commitLabel: deployed_commit_short_sha,
        commitUrl: deployed_commit_url
      }
    }
  end
end

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
      initialProjects: projects_table_initial_load? ? initial_projects : nil,
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

  private

    # REFERENCE PATTERN: ssr-query-hydration — see AGENTS.md
    # Only seed on the initial full-page load of the /projects table route. Seeding
    # on other dashboard routes (/dashboard, /projects/new, /settings) would let a
    # mutation made before ProjectsTable ever mounts leave a stale seed that the
    # table later adopts as fresh initialData (30s staleTime). See PR #174 review.
    def projects_table_initial_load?
      request.path == projects_path
    end

    # SSR seed for the TanStack Query projects table. per_page: 8 mirrors
    # ProjectsTable's client query so the seeded cache entry matches its query
    # key (['projects', status, sort, dir, page]) exactly. ProjectsQuery keeps the
    # filtering/sorting/pagination identical to Api::ProjectsController, so the
    # seed equals what a later refetch returns.
    def initial_projects
      query = ProjectsQuery.new(
        Current.user.projects,
        status: params[:status],
        sort: params[:sort],
        dir: params[:dir],
        page: params[:page],
        per_page: 8
      )
      result = query.result

      {
        params: query.normalized_params,
        response: {
          projects: result[:records].map { |project| ProjectSerializer.one(project) },
          meta: result[:meta]
        }
      }
    end
end

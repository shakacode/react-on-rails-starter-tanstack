module ProjectSerializer
  # Single source of truth for the JSON shape of a project. Used by the live API
  # (Api::ProjectsController) and the SSR seed (DashboardController) so a
  # server-seeded TanStack Query cache entry is identical to a later refetch.
  module_function

  def one(project)
    {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      last_activity_at: project.last_activity_at&.iso8601,
      archived: project.archived?,
      updated_at: project.updated_at.iso8601
    }
  end
end

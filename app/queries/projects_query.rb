class ProjectsQuery
  # Shared listing logic for projects: status filtering, sort whitelist,
  # direction, and pagination. Used by both Api::ProjectsController (live JSON)
  # and DashboardController (SSR seed for TanStack Query) so the two can never
  # drift — the SSR-seeded cache entry must match a later client refetch exactly.
  SORT_COLUMNS = %w[name status last_activity_at created_at].freeze
  DEFAULT_SORT = "last_activity_at"
  DEFAULT_PER_PAGE = 20
  MAX_PER_PAGE = 50

  def self.from_params(relation, params)
    new(
      relation,
      status: params[:status],
      sort: params[:sort],
      dir: params[:dir],
      page: params[:page],
      per_page: params[:per_page]
    )
  end

  def initialize(relation, status: nil, sort: nil, dir: nil, page: nil, per_page: nil)
    @relation = relation
    @status = status.to_s
    @sort = SORT_COLUMNS.include?(sort) ? sort : DEFAULT_SORT
    @dir = dir == "asc" ? :asc : :desc
    @page = [ (page.presence || 1).to_i, 1 ].max
    @per_page = (per_page.presence || DEFAULT_PER_PAGE).to_i.clamp(1, MAX_PER_PAGE)
  end

  # Echoed to the client so it can confirm the SSR seed matches its query key
  # (['projects', status, sort, dir, page]) before using it as initialData.
  def normalized_params
    { status: filter_status? ? @status : "", sort: @sort, dir: @dir.to_s, page: @page }
  end

  def result
    scoped = @relation
    scoped = scoped.where(status: Project.statuses.fetch(@status)) if filter_status?
    total = scoped.count
    records = scoped.order(@sort => @dir, id: :asc).limit(@per_page).offset((@page - 1) * @per_page)

    { records: records, meta: { page: @page, per_page: @per_page, total: total } }
  end

  private

    def filter_status?
      Project.statuses.key?(@status)
    end
end

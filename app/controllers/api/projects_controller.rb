module Api
  class ProjectsController < BaseController
    rescue_from ActiveRecord::RecordNotFound, with: :not_found

    def index
      projects = scoped_projects
      total = projects.count
      projects = projects.limit(per_page).offset((page - 1) * per_page)

      render json: {
        projects: projects.map { |project| project_json(project) },
        meta: {
          page: page,
          per_page: per_page,
          total: total
        }
      }
    end

    def show
      render json: { project: project_json(project) }
    end

    def create
      project = Current.user.projects.new(project_params)

      if project.save
        render json: { project: project_json(project) }, status: :created
      else
        validation_error(project)
      end
    end

    def update
      if project.update(project_params)
        render json: { project: project_json(project) }
      else
        validation_error(project)
      end
    end

    def metrics
      project

      render json: {
        total: Current.user.projects.count,
        active_count: Current.user.projects.active.count,
        completed_this_week: Current.user.projects.completed.where(updated_at: 1.week.ago..).count,
        avg_cycle_time: average_cycle_time_days
      }
    end

    private

      def project
        @project ||= Current.user.projects.find(params[:id])
      end

      def scoped_projects
        projects = Current.user.projects
        projects = projects.where(status: Project.statuses.fetch(params[:status])) if Project.statuses.key?(params[:status])
        projects.order(sort_column => sort_direction, id: :asc)
      end

      def project_json(project)
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

      def sort_column
        %w[name status last_activity_at created_at].include?(params[:sort]) ? params[:sort] : "last_activity_at"
      end

      def sort_direction
        params[:dir] == "asc" ? :asc : :desc
      end

      def page
        [ (params[:page].presence || 1).to_i, 1 ].max
      end

      def per_page
        (params[:per_page].presence || 20).to_i.clamp(1, 50)
      end

      def project_params
        params.expect(project: %i[name description status last_activity_at])
      end

      def average_cycle_time_days
        completed = Current.user.projects.completed.where.not(last_activity_at: nil)
        return 0.0 if completed.empty?

        seconds = completed.average("EXTRACT(EPOCH FROM (last_activity_at - created_at))").to_f
        (seconds / 1.day).round(1)
      end

      def validation_error(project)
        render json: {
          error: project.errors.full_messages.to_sentence,
          errors: project.errors.to_hash(true)
        }, status: :unprocessable_content
      end

      def not_found
        render json: { error: "Project not found" }, status: :not_found
      end
  end
end

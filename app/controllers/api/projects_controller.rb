module Api
  class ProjectsController < BaseController
    # REFERENCE PATTERN: json-api-controller — see AGENTS.md
    rescue_from ActiveRecord::RecordNotFound, with: :not_found

    def index
      result = ProjectsQuery.from_params(Current.user.projects, params).result

      render json: {
        projects: result[:records].map { |project| ProjectSerializer.one(project) },
        meta: result[:meta]
      }
    end

    def show
      render json: { project: ProjectSerializer.one(project) }
    end

    def create
      project = Current.user.projects.new(project_params)

      if project.save
        render json: { project: ProjectSerializer.one(project) }, status: :created
      else
        validation_error(project)
      end
    end

    def update
      if project.update(project_params)
        render json: { project: ProjectSerializer.one(project) }
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

      def project_params
        params.expect(project: %i[name description status last_activity_at])
      end

      def average_cycle_time_days
        completed = Current.user.projects.completed.where.not(last_activity_at: nil)
        return 0.0 if completed.empty?

        seconds = completed.average(Arel.sql("GREATEST(EXTRACT(EPOCH FROM (last_activity_at - created_at)), 0)")).to_f
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

class ProjectsController < AuthenticatedController
  # REFERENCE PATTERN: controller — see AGENTS.md §2
  before_action :set_project, only: %i[show edit update destroy]

  def index
    @projects = Current.user.projects.recent
  end

  def show; end

  def new
    @project = Current.user.projects.new
  end

  def create
    @project = Current.user.projects.new(project_params)

    if @project.save
      redirect_to classic_project_path(@project), notice: "Project created."
    else
      render :new, status: :unprocessable_content
    end
  end

  def edit; end

  def update
    if @project.update(project_params)
      redirect_to classic_project_path(@project), notice: "Project updated."
    else
      render :edit, status: :unprocessable_content
    end
  end

  def destroy
    @project.archive!
    redirect_to classic_projects_path, notice: "Project archived.", status: :see_other
  end

  private

    def set_project
      @project = Current.user.projects.find(params[:id])
    end

    def project_params
      params.expect(project: %i[name description status last_activity_at])
    end
end

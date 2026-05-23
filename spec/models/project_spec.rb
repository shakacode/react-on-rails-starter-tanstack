require "rails_helper"

RSpec.describe Project, type: :model do
  it "defines the required status enum" do
    expect(described_class.statuses).to eq(
      "active" => 0,
      "paused" => 1,
      "completed" => 2,
      "archived" => 3
    )
  end

  it "validates name presence and length" do
    project = build(:project, name: "")

    expect(project).not_to be_valid
    expect(project.errors[:name]).to include("can't be blank")
  end

  it "orders recent projects by last activity" do
    user = create(:user, :verified)
    older = create(:project, user: user, last_activity_at: 2.days.ago)
    newer = create(:project, user: user, last_activity_at: 1.hour.ago)

    expect(user.projects.recent).to eq([ newer, older ])
  end

  it "archives without deleting" do
    project = create(:project)

    expect { project.archive! }.not_to change(described_class, :count)
    expect(project).to be_archived
  end

  it "records completion as project activity" do
    project = create(:project, last_activity_at: 2.days.ago)
    previous_activity = project.last_activity_at

    project.update!(status: :completed)

    expect(project.reload.last_activity_at).to be > previous_activity
    expect(project.last_activity_at).to be > 1.minute.ago
  end
end

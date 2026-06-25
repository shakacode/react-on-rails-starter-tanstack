require "rails_helper"

RSpec.describe ProjectSerializer do
  it "serializes a project to the API shape with iso8601 timestamps" do
    project = create(:project, :active, name: "Launch", description: "Phase 3")

    json = ProjectSerializer.one(project)

    expect(json).to include(
      id: project.id,
      name: "Launch",
      description: "Phase 3",
      status: "active",
      archived: false
    )
    expect(json[:last_activity_at]).to eq(project.last_activity_at.iso8601)
    expect(json[:updated_at]).to eq(project.updated_at.iso8601)
    expect(json.keys).to contain_exactly(
      :id, :name, :description, :status, :last_activity_at, :archived, :updated_at
    )
  end
end

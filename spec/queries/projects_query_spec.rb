require "rails_helper"

RSpec.describe ProjectsQuery do
  let(:user) { create(:user, :verified) }

  def names(result)
    result[:records].map(&:name)
  end

  describe "defaults (no params)" do
    it "orders by last_activity_at desc with an id tiebreaker and reports normalized params" do
      older = create(:project, user:, name: "Older", last_activity_at: 2.days.ago)
      newer = create(:project, user:, name: "Newer", last_activity_at: 1.hour.ago)

      query = ProjectsQuery.new(user.projects)
      result = query.result

      expect(names(result)).to eq(%w[Newer Older])
      expect(result[:meta]).to eq(page: 1, per_page: 20, total: 2)
      expect(query.normalized_params).to eq(status: "", sort: "last_activity_at", dir: "desc", page: 1)
    end
  end

  describe "status filtering" do
    it "filters to a valid status and treats an unknown status as no filter" do
      create(:project, :active, user:, name: "Active one")
      create(:project, :paused, user:, name: "Paused one")

      expect(names(ProjectsQuery.new(user.projects, status: "active").result)).to eq([ "Active one" ])
      expect(ProjectsQuery.new(user.projects, status: "active").normalized_params[:status]).to eq("active")

      bogus = ProjectsQuery.new(user.projects, status: "bogus")
      expect(bogus.result[:records].count).to eq(2)
      expect(bogus.normalized_params[:status]).to eq("")
    end
  end

  describe "sorting" do
    it "honors a whitelisted sort+dir and falls back to the default for an unknown sort" do
      create(:project, user:, name: "Bravo")
      create(:project, user:, name: "Alpha")

      asc = ProjectsQuery.new(user.projects, sort: "name", dir: "asc").result
      expect(names(asc)).to eq(%w[Alpha Bravo])

      # An unknown sort key must not reach the ORDER BY (SQL-injection guard).
      query = ProjectsQuery.new(user.projects, sort: "name; drop table projects", dir: "asc")
      expect(query.normalized_params[:sort]).to eq("last_activity_at")
      expect { query.result }.not_to raise_error
    end
  end

  describe "pagination" do
    it "limits, offsets, clamps per_page, and floors page at 1" do
      create_list(:project, 5, user:)

      page1 = ProjectsQuery.new(user.projects, page: 1, per_page: 2).result
      expect(page1[:records].size).to eq(2)
      expect(page1[:meta]).to eq(page: 1, per_page: 2, total: 5)

      page3 = ProjectsQuery.new(user.projects, page: 3, per_page: 2).result
      expect(page3[:records].size).to eq(1) # remainder of 5 / 2

      expect(ProjectsQuery.new(user.projects, per_page: 999).result[:meta][:per_page]).to eq(50) # clamp max
      expect(ProjectsQuery.new(user.projects, per_page: 0).result[:meta][:per_page]).to eq(1)     # clamp min
      expect(ProjectsQuery.new(user.projects, page: 0).normalized_params[:page]).to eq(1)          # floor
    end
  end

  describe ".from_params" do
    it "reads status/sort/dir/page/per_page from a params-like hash" do
      create(:project, :paused, user:, name: "Only paused")
      create(:project, :active, user:, name: "An active one")

      params = ActionController::Parameters.new(
        status: "paused", sort: "name", dir: "asc", page: "1", per_page: "5"
      )
      result = ProjectsQuery.from_params(user.projects, params).result

      expect(names(result)).to eq([ "Only paused" ])
      expect(result[:meta][:per_page]).to eq(5)
    end
  end
end

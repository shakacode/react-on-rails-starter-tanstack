# frozen_string_literal: true

class HomeController < ApplicationController
  allow_unauthenticated_access

  # Demo dataset shown in the landing-page "same app, two front-ends" comparison.
  # The same rows are rendered two ways: server-side here (the classic Rails panel,
  # filtered/sorted on each request = a real round trip) and by the TanStack Table
  # client island (instant, no reload). Status names mirror the real Project enum.
  DEMO_PROJECTS = [
    { id: 1, name: "Aurora Analytics", owner: "Maya Chen", status: "Active", last_activity_at: "2026-05-26" },
    { id: 2, name: "Beacon Billing", owner: "Liam Patel", status: "Active", last_activity_at: "2026-05-24" },
    { id: 3, name: "Cedar CMS", owner: "Noah Williams", status: "Paused", last_activity_at: "2026-04-30" },
    { id: 4, name: "Delta Dashboards", owner: "Ava Rodriguez", status: "Active", last_activity_at: "2026-05-27" },
    { id: 5, name: "Ember Email", owner: "Maya Chen", status: "Completed", last_activity_at: "2026-03-18" },
    { id: 6, name: "Forge Forms", owner: "Liam Patel", status: "Active", last_activity_at: "2026-05-21" },
    { id: 7, name: "Glacier Graphs", owner: "Sofia Rossi", status: "Paused", last_activity_at: "2026-05-02" },
    { id: 8, name: "Harbor Hosting", owner: "Noah Williams", status: "Archived", last_activity_at: "2025-11-12" },
    { id: 9, name: "Indigo Imports", owner: "Ava Rodriguez", status: "Completed", last_activity_at: "2026-02-09" },
    { id: 10, name: "Juniper Jobs", owner: "Sofia Rossi", status: "Active", last_activity_at: "2026-05-19" },
    { id: 11, name: "Kestrel KPIs", owner: "Maya Chen", status: "Active", last_activity_at: "2026-05-25" },
    { id: 12, name: "Lumen Ledger", owner: "Liam Patel", status: "Paused", last_activity_at: "2026-04-14" },
    { id: 13, name: "Meridian Mail", owner: "Noah Williams", status: "Completed", last_activity_at: "2026-01-28" },
    { id: 14, name: "Nimbus Notes", owner: "Sofia Rossi", status: "Archived", last_activity_at: "2025-09-30" }
  ].freeze

  SORTABLE_COLUMNS = %w[name owner status activity].freeze
  # Match the TanStack island's page size so both panels show the same rows per
  # page, reinforcing the "same data, two front-ends" comparison.
  RAILS_PANEL_PAGE_SIZE = 5

  def index
    @demo_projects = DEMO_PROJECTS

    @rails_query = params[:q].to_s.strip
    @rails_sort = SORTABLE_COLUMNS.include?(params[:sort]) ? params[:sort] : "activity"
    @rails_dir = params[:dir] == "asc" ? "asc" : "desc"
    @rails_page = [ params[:page].to_i, 1 ].max

    rows = filter_demo_projects(@rails_query)
    rows = sort_demo_projects(rows, @rails_sort, @rails_dir)

    @rails_total = rows.size
    @rails_page_count = [ (rows.size.to_f / RAILS_PANEL_PAGE_SIZE).ceil, 1 ].max
    @rails_page = [ @rails_page, @rails_page_count ].min
    @rails_rows = rows.slice((@rails_page - 1) * RAILS_PANEL_PAGE_SIZE, RAILS_PANEL_PAGE_SIZE) || []
  end

  private

  def filter_demo_projects(query)
    return DEMO_PROJECTS if query.blank?

    needle = query.downcase
    DEMO_PROJECTS.select do |project|
      project[:name].downcase.include?(needle) ||
        project[:owner].downcase.include?(needle) ||
        project[:status].downcase.include?(needle)
    end
  end

  def sort_demo_projects(rows, sort, dir)
    sorted =
      case sort
      when "name", "owner", "status"
        rows.sort_by { |project| project[sort.to_sym].downcase }
      else
        rows.sort_by { |project| project[:last_activity_at] }
      end

    dir == "asc" ? sorted : sorted.reverse
  end
end

# frozen_string_literal: true

module HomeHelper
  # Renders a sortable column header for the server-rendered "classic Rails" comparison
  # panel. Each click is an ordinary GET link, so sorting triggers a full page reload,
  # which is exactly the round-trip behavior the comparison is meant to show.
  def home_sort_link(label, column)
    active = @rails_sort == column
    next_dir = active && @rails_dir == "asc" ? "desc" : "asc"
    indicator = active ? (@rails_dir == "asc" ? " ↑" : " ↓") : ""

    link_to(
      "#{label}#{indicator}",
      root_path(q: @rails_query.presence, sort: column, dir: next_dir, anchor: "comparison"),
      class: "inline-flex items-center font-medium #{'text-foreground' if active} hover:text-foreground"
    )
  end

  def home_rails_page_link(label, page, disabled:)
    classes = "inline-flex items-center rounded-md border border-border px-2.5 py-1 text-sm"
    if disabled
      content_tag(:span, label, class: "#{classes} cursor-not-allowed text-muted-foreground/50")
    else
      link_to(
        label,
        root_path(q: @rails_query.presence, sort: @rails_sort, dir: @rails_dir, page: page, anchor: "comparison"),
        class: "#{classes} text-foreground transition-colors hover:bg-muted"
      )
    end
  end
end

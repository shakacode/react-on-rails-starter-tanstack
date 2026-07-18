# frozen_string_literal: true

require "spec_helper"
require "yaml"

RSpec.describe "Control Plane template mappings" do
  def load_yaml(path)
    YAML.safe_load_file(File.expand_path("../../#{path}", __dir__), aliases: true)
  end

  def review_app_config
    apps = load_yaml(".controlplane/controlplane.yml").fetch("apps").values
    matches = apps.select { |app| app.key?("match_if_app_name_starts_with") }

    expect(matches.length == 1).to be(true), "expected exactly one disposable review app configuration"
    matches.first
  end

  def shared_grant_target
    grants = review_app_config.fetch("shared_secret_grants")

    expect(grants.length == 1).to be(true), "expected exactly one disposable review app shared grant"
    grants.first.fetch("secret_name")
  end

  def review_database_reference
    env = load_yaml(".controlplane/templates/app-review.yml").dig("spec", "env")
    mappings = env.select do |mapping|
      name = mapping.fetch("name").downcase
      name.include?("database") && name.include?("password")
    end

    expect(mappings.length == 1).to be(true), "expected exactly one disposable database credential mapping"

    match = mappings.first.fetch("value").match(%r{\Acpln://secret/([^/]+)\z})
    expect(!match.nil?).to be(true), "expected a repository-managed credential reference"
    match[1]
  end

  it "maps the disposable database credential to its declared shared grant target" do
    mapping_matches_grant = review_database_reference == shared_grant_target

    expect(mapping_matches_grant).to be(true),
                                     "disposable database credential must match its declared shared grant target"
  end
end

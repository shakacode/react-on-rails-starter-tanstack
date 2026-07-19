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

  def shared_grant
    grants = review_app_config.fetch("shared_secret_grants")

    expect(grants.length == 1).to be(true), "expected exactly one disposable review app shared grant"
    grants.first
  end

  def shared_grant_placeholder(grant)
    "{{SHARED_SECRET_#{grant.fetch('name').upcase}}}"
  end

  def review_database_mapping
    env = load_yaml(".controlplane/templates/app-review.yml").dig("spec", "env")
    mappings = env.select do |mapping|
      name = mapping.fetch("name").downcase
      name.include?("database") && name.include?("password")
    end

    expect(mappings.length == 1).to be(true), "expected exactly one disposable database credential mapping"
    mappings.first
  end

  def review_database_reference(value)
    match = value.match(%r{\Acpln://secret/([^/.]+)\.([^/.]+)\z})
    expect(!match.nil?).to be(true), "expected a repository-managed dictionary-field reference"
    { target: match[1], field: match[2] }
  end

  it "maps the disposable database credential through its declared shared grant placeholder" do
    grant = shared_grant
    mapping = review_database_mapping
    placeholder = shared_grant_placeholder(grant)
    committed_reference = review_database_reference(mapping.fetch("value"))

    expect(committed_reference.fetch(:target)).to eq(placeholder),
                                                   "disposable database credential must use its shared grant placeholder"

    rendered_value = mapping.fetch("value").gsub(placeholder, grant.fetch("secret_name"))
    rendered_reference = review_database_reference(rendered_value)
    mapping_matches_grant = rendered_reference.fetch(:target) == grant.fetch("secret_name")
    mapping_matches_field = rendered_reference.fetch(:field) == mapping.fetch("name").split("_").last.downcase

    expect(mapping_matches_grant).to be(true),
                                     "renderer substitution must target the declared shared grant"
    expect(mapping_matches_field).to be(true),
                                     "renderer substitution must retain the declared dictionary field"
  end
end

# frozen_string_literal: true

require "ripper"
require "spec_helper"

RSpec.describe "production SSL configuration" do
  let(:production_config_source) do
    File.read(File.expand_path("../../config/environments/production.rb", __dir__))
  end

  it "forces SSL in production" do
    expect(latest_config_assignment_value("force_ssl")).to eq("true")
  end

  it "assumes SSL behind the production reverse proxy" do
    expect(latest_config_assignment_value("assume_ssl")).to eq("true")
  end

  def latest_config_assignment_value(setting)
    assignments = []

    walk_ruby_ast(Ripper.sexp(production_config_source)) do |node|
      assignments << node[2] if node[0] == :assign && config_field_assignment?(node[1], setting)
    end

    ruby_literal_keyword(assignments.last)
  end

  def walk_ruby_ast(node, &block)
    return unless node.is_a?(Array)

    yield node
    node.each { |child| walk_ruby_ast(child, &block) }
  end

  def config_field_assignment?(node, setting)
    node.is_a?(Array) &&
      node[0] == :field &&
      node.dig(1, 0) == :vcall &&
      node.dig(1, 1, 0) == :@ident &&
      node.dig(1, 1, 1) == "config" &&
      node.dig(3, 0) == :@ident &&
      node.dig(3, 1) == setting
  end

  def ruby_literal_keyword(node)
    return unless node.is_a?(Array) && node[0] == :var_ref && node.dig(1, 0) == :@kw

    node.dig(1, 1)
  end
end

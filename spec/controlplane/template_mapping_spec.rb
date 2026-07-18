require "spec_helper"
require "pathname"
require "yaml"

RSpec.describe "Control Plane template mappings" do
  def root
    @root ||= Pathname.new(__dir__).join("../..").expand_path
  end

  def mismatch_message
    "review template database credential reference must match canonical template"
  end

  def named_mappings(node, found = [])
    case node
    when Hash
      found << node if node.key?("name") && node["value"].is_a?(String)
      node.each_value { |value| named_mappings(value, found) }
    when Array
      node.each { |value| named_mappings(value, found) }
    end
    found
  end

  def database_credential_reference(filename)
    document = YAML.safe_load_file(root.join(".controlplane/templates", filename), aliases: true)
    mappings = named_mappings(document).select do |mapping|
      mapping.fetch("name").match?(/database.*password/i) &&
        mapping.fetch("value").start_with?("cpln://secret/")
    end
    expect(mappings.length).to eq(1), "expected exactly one database credential mapping"
    mappings.fetch(0).fetch("value")
  end

  def expect_reference_to_match(canonical, candidate)
    expect(candidate == canonical).to be(true), mismatch_message
  end

  it "matches the review app database credential reference to the canonical app template" do
    canonical = database_credential_reference("app.yml")
    review = database_credential_reference("app-review.yml")

    expect_reference_to_match(canonical, review)
  end

  it "reports a sanitized failure when the references differ" do
    canonical = database_credential_reference("app.yml")
    mismatched = "cpln://secret/redacted-mismatch"

    expect do
      expect_reference_to_match(canonical, mismatched)
    end.to raise_error(RSpec::Expectations::ExpectationNotMetError) do |error|
      message_is_sanitized = error.message.include?(mismatch_message)
      leaked_reference = [ canonical, mismatched ].any? { |reference| error.message.include?(reference) }

      expect(message_is_sanitized).to be(true), "failure did not use the sanitized mismatch message"
      expect(leaked_reference).to be(false), "sanitized failure disclosed a credential reference"
    end
  end
end

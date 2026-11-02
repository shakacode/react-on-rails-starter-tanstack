require "spec_helper"
require "fileutils"
require "open3"
require "pathname"
require "tmpdir"

RSpec.describe "Control Plane release script" do
  ROOT = Pathname.new(__dir__).join("../..").expand_path
  RELEASE_SCRIPT = ROOT.join(".controlplane/release_script.sh")

  def run_release_script(env = {})
    Dir.mktmpdir do |tmpdir|
      tmp_path = Pathname.new(tmpdir)
      calls_path = tmp_path.join("rails-calls.log")
      bin_path = tmp_path.join("bin")

      FileUtils.mkdir_p(bin_path)
      bin_path.join("rails").write(<<~SH)
        #!/bin/sh
        echo "$*" >> "$RAILS_CALL_LOG"
        if [ "$1" = "db:prepare" ] && [ -n "${DB_PREPARE_ERROR:-}" ]; then
          calls=$(grep -c "db:prepare" "$RAILS_CALL_LOG")
          if [ "$calls" -le "${DB_PREPARE_FAILURES:-0}" ]; then
            echo "$DB_PREPARE_ERROR" >&2
            exit 1
          fi
        fi
      SH
      FileUtils.chmod("+x", bin_path.join("rails"))

      stdout, stderr, status = Open3.capture3(
        { "ALLOW_DEMO_SEED" => nil, "DB_PREPARE_RETRY_DELAY_SECONDS" => "0", "RAILS_CALL_LOG" => calls_path.to_s }.merge(env),
        RELEASE_SCRIPT.to_s,
        chdir: tmp_path.to_s
      )

      calls = calls_path.exist? ? calls_path.read.lines.map(&:chomp) : []
      [ status, stdout, stderr, calls ]
    end
  end

  it "runs migrations without seeding by default" do
    status, _stdout, stderr, calls = run_release_script

    expect(status).to be_success, stderr
    expect(calls).to eq([ "db:prepare" ])
  end

  it "seeds the demo account when explicitly enabled" do
    status, _stdout, stderr, calls = run_release_script("ALLOW_DEMO_SEED" => "true")

    expect(status).to be_success, stderr
    expect(calls).to eq([ "db:prepare", "db:seed" ])
  end

  it "retries db:prepare after a closed database connection" do
    status, _stdout, stderr, calls = run_release_script(
      "DB_PREPARE_ERROR" => "PG::ConnectionBad: server closed the connection unexpectedly",
      "DB_PREPARE_FAILURES" => "2"
    )

    expect(status).to be_success, stderr
    expect(calls).to eq([ "db:prepare", "db:prepare", "db:prepare" ])
  end

  it "fails without seeding after five closed connections" do
    status, _stdout, stderr, calls = run_release_script(
      "ALLOW_DEMO_SEED" => "true",
      "DB_PREPARE_ERROR" => "ActiveRecord::ConnectionNotEstablished: server closed the connection unexpectedly",
      "DB_PREPARE_FAILURES" => "99"
    )

    expect(status).not_to be_success
    expect(stderr).to include("Failed to run DB migrations")
    expect(calls).to eq([ "db:prepare" ] * 5)
  end

  it "does not retry a migration failure" do
    status, _stdout, stderr, calls = run_release_script(
      "DB_PREPARE_ERROR" => "StandardError: migration failed",
      "DB_PREPARE_FAILURES" => "99"
    )

    expect(status).not_to be_success
    expect(stderr).to include("migration failed", "Failed to run DB migrations")
    expect(calls).to eq([ "db:prepare" ])
  end
end

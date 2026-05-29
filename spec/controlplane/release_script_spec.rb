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
      SH
      FileUtils.chmod("+x", bin_path.join("rails"))

      stdout, stderr, status = Open3.capture3(
        { "ALLOW_DEMO_SEED" => nil, "RAILS_CALL_LOG" => calls_path.to_s }.merge(env),
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
end

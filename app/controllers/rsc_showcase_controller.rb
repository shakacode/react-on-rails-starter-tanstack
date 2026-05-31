# frozen_string_literal: true

class RscShowcaseController < ApplicationController
  allow_unauthenticated_access

  def show
    @rsc_showcase_props = {
      initialPath: request.path,
      rscAvailable: rsc_client_references_available?,
      rscPayloadPath: ReactOnRailsPro.configuration.rsc_payload_generation_url_path,
      rscComponentName: "RscShowcaseServerPanel",
      build: {
        commitSha: deployed_commit_sha,
        commitLabel: deployed_commit_short_sha,
        commitUrl: deployed_commit_url
      }
    }
  end

  private

  def rsc_client_references_available?
    rsc_manifest_paths.all? do |path|
      path.present? && File.exist?(path)
    end
  rescue StandardError
    false
  end

  def rsc_manifest_paths
    [
      ReactOnRailsPro::Utils.react_client_manifest_file_path,
      ReactOnRailsPro::Utils.react_server_client_manifest_file_path
    ]
  end
end

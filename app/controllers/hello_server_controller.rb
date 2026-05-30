# frozen_string_literal: true

# HelloServer Controller - React Server Components
# This controller demonstrates how to render RSC pages with streaming SSR.
# It's the RSC counterpart to HelloWorldController.
#
# ReactOnRailsPro::Stream provides:
# - stream_view_containing_react_components: Streams the view with RSC support
# - Streaming HTML chunks as components render
# - Automatic hydration on the client
#
# For more information, see:
# https://reactonrails.com/docs/pro/react-server-components/
#
# Graceful RSC fallback:
# The interactive RSC client-reference path depends on the React Server Components
# client/server manifests emitted by the bundler. On the current Rspack build these
# manifests are not produced (a documented AMBER limitation tracked in SPIKE.md and
# upstream shakacode/react_on_rails#1828). When they are missing at runtime, streaming
# the RSC view would raise and a visitor would see a raw 500 error page. Instead we
# detect the gap up front and render an honest, server-rendered fallback that keeps the
# demo shell intact and explains the limitation. See app/views/hello_server/unavailable.

class HelloServerController < ApplicationController
  allow_unauthenticated_access

  layout "react_on_rails_default"

  include ReactOnRailsPro::Stream

  def index
    @hello_server_props = {
      name: "React on Rails Pro"
    }

    unless rsc_client_references_available?
      render "hello_server/unavailable"
      return
    end

    stream_view_containing_react_components(template: "hello_server/index")
  end

  private

  # Returns true when the React Server Components client/server manifests are present,
  # which the interactive RSC client-reference path needs at runtime. Returns false when
  # either manifest is missing (the documented Rspack limitation, see SPIKE.md), so the
  # action can degrade to a static, honest fallback instead of streaming into a 500.
  def rsc_client_references_available?
    rsc_manifest_paths.all? do |path|
      path.present? && File.exist?(path)
    end
  rescue StandardError
    # Any resolution failure (for example a missing manifest entry) means the
    # interactive client-reference path is not available on this build.
    false
  end

  def rsc_manifest_paths
    [
      ReactOnRailsPro::Utils.react_client_manifest_file_path,
      ReactOnRailsPro::Utils.react_server_client_manifest_file_path
    ]
  end
end

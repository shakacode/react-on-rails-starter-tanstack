# frozen_string_literal: true

# Be sure to restart your server when you modify this file.

Rails.application.configure do
  localhost_http_sources = %w[
    http://localhost:*
    http://127.0.0.1:*
  ].freeze

  localhost_websocket_sources = %w[
    ws://localhost:*
    ws://127.0.0.1:*
  ].freeze

  config.content_security_policy do |policy|
    script_sources = [ :self ]
    style_sources = [ :self, :unsafe_inline ]
    connect_sources = [ :self ]

    if Rails.env.development?
      script_sources += [ :unsafe_eval, *localhost_http_sources ]
      style_sources += localhost_http_sources
      connect_sources += localhost_http_sources + localhost_websocket_sources
    end

    policy.default_src :self
    policy.base_uri :self
    policy.connect_src(*connect_sources)
    policy.font_src :self, :data
    policy.form_action :self
    policy.frame_ancestors :self
    policy.img_src :self, :data
    policy.manifest_src :self
    policy.media_src :self
    policy.object_src :none
    policy.script_src(*script_sources)
    # Inline styles remain for the current Rails demo pages and React style props.
    policy.style_src(*style_sources)
    policy.worker_src :self
  end

  config.content_security_policy_nonce_generator = ->(_request) { SecureRandom.base64(16) }
  config.content_security_policy_nonce_directives = %w[script-src]
  config.content_security_policy_nonce_auto = true
end

# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Health endpoint", type: :request do
  it "responds successfully" do
    get rails_health_check_path

    expect(response).to have_http_status(:ok)
  end
end

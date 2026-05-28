# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Health endpoint", type: :request do
  it "responds successfully" do
    get rails_health_check_path

    expect(response).to have_http_status(:ok)
  end
end

RSpec.describe "Public page accessibility", type: :request do
  def parsed_response
    Nokogiri::HTML(response.body)
  end

  it "sets the document language and main landmark on the landing page" do
    get root_path

    expect(response).to have_http_status(:ok)
    expect(parsed_response.at_css("html")["lang"]).to eq("en")
    expect(parsed_response.css("main.ror-home").count).to eq(1)
  end

  it "sets the document language on the sign-in page" do
    get new_session_path

    expect(response).to have_http_status(:ok)
    expect(parsed_response.at_css("html")["lang"]).to eq("en")
  end
end

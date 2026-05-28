module ApplicationHelper
  def demo_credentials_hint_enabled?
    DemoAccount.seed_enabled?
  end
end

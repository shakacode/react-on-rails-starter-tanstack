class WelcomeMailerPreview < ActionMailer::Preview
  def welcome
    WelcomeMailer.welcome(User.new(name: "Taylor Rails", email_address: "taylor@example.com"))
  end
end

class PasswordsMailerPreview < ActionMailer::Preview
  def reset
    PasswordsMailer.reset(preview_user)
  end

  private

    def preview_user
      User.new(name: "Taylor Rails", email_address: "taylor@example.com")
    end
end

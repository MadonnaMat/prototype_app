require "test_helper"

Capybara.enable_aria_label = true

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]

  # Logs in through the real UI (rather than seeding a session cookie
  # directly) so the browser ends up in the same state a user's would be in
  # -- necessary since / now redirects to /login when signed out.
  def sign_in_as(user, password: "password")
    visit "/login"
    fill_in "Email", with: user.email_address
    fill_in "Password", with: password
    click_button "Log in"
    assert_selector "h1", text: "Tasks"
  end
end

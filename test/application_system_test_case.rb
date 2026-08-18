require "test_helper"

Capybara.enable_aria_label = true

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]

  # Logs in through the real UI (rather than seeding a session cookie
  # directly) so the browser ends up in the same state a user's would be in
  # -- necessary since / now redirects to /login when signed out.
  def sign_in_as(user, password: "password")
    visit "/login"
    wait_for_hydration
    fill_in "Email", with: user.email_address
    fill_in "Password", with: password
    click_button "Log in"
    assert_selector "h1", text: "Tasks"
  end

  # React on Rails server-renders real content (including interactive-looking
  # buttons/links) before the client has hydrated and attached any event
  # listeners to it, so a page-content assertion right after `visit` isn't a
  # reliable "ready to interact" signal -- it passes on the SSR paint alone.
  # TaskApp marks <body data-hydrated="true"> once React has actually taken
  # over (see app/javascript/src/TaskApp/TaskApp.tsx); wait for that instead.
  def wait_for_hydration
    assert_selector "body[data-hydrated='true']", visible: :all
  end

  # WebDriver clicks against this app's interactive elements (Base UI
  # buttons/dialog triggers, react-router links) occasionally don't take
  # effect in headless Chrome -- no JS error, the click event fires, but
  # whatever it's supposed to trigger (navigation, a dialog opening) just
  # doesn't happen. Re-issuing the click if the expected result hasn't shown
  # up within a short beat works around it without papering over a real
  # failure: a genuinely broken interaction still exhausts the retries and
  # fails normally on the assertion that follows.
  def click_and_wait_for(text:, retries: 10, &click)
    click.call
    click.call until page.has_text?(text, wait: 2) || (retries -= 1) < 0
    assert_text text
  end
end

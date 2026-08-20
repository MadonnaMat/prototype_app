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
  # buttons/dialog triggers, react-router links) don't reliably trigger
  # their effect (navigation, a dialog opening) in headless Chrome -- no JS
  # error, the click event fires, but whatever it's supposed to do just
  # doesn't happen. Confirmed via a raw `element.click()` succeeding every
  # time on the exact element where Capybara's native (WebDriver) click
  # sometimes doesn't: Base UI's `<Button render={<Link .../>}>` pattern
  # renders as `<a type="button">`, and WebDriver's synthetic input
  # pipeline doesn't reliably land on it the way a direct DOM click does.
  # Dispatching the click via JS instead of through WebDriver sidesteps
  # that; the retry loop stays as a safety net for genuine timing issues,
  # not as the primary fix.
  def click_and_wait_for(locator, text:, retries: 10, **find_options)
    perform_click = -> { page.execute_script("arguments[0].click()", find(:link_or_button, locator, **find_options).native) }
    perform_click.call
    perform_click.call until page.has_text?(text, wait: 2) || (retries -= 1) < 0
    assert_text text
  end
end

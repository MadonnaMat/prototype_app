require "application_system_test_case"

class PagesTest < ApplicationSystemTestCase
  test "visiting the home page renders the React app" do
    visit root_path

    assert_selector "h1", text: "Prototype App"
    assert_text "Hello, Rails! React 19 is rendering this component."
    assert_button "shadcn Button"
  end
end

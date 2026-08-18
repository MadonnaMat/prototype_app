require "application_system_test_case"

class PagesTest < ApplicationSystemTestCase
  setup do
    @user = users(:one)
    sign_in_as(@user)
  end

  test "visiting the home page renders the task list" do
    visit root_path

    assert_selector "h1", text: "Tasks"
    assert_text tasks(:one).title
    assert_link "New Task"
  end

  test "creating a task from the list page shows a success toast" do
    visit root_path
    wait_for_hydration
    click_and_wait_for(text: "New task") { click_link "New Task" }

    fill_in "Title", with: "Walk the dog"
    click_and_wait_for(text: "Task created") { click_on "Create task" }

    assert_selector "h1", text: "Tasks"
    assert_text "Walk the dog"
    assert_text "Task created"
  end

  test "backing out of a new task with no edits does not ask for confirmation" do
    visit root_path
    wait_for_hydration
    click_and_wait_for(text: "New task") { click_link "New Task" }

    click_and_wait_for(text: "Tasks") { click_on "Back" }

    assert_selector "h1", text: "Tasks"
  end

  test "backing out of an edited form asks for confirmation before discarding" do
    visit root_path
    wait_for_hydration
    click_and_wait_for(text: "New task") { click_link "New Task" }

    fill_in "Title", with: "Unsaved task"
    click_and_wait_for(text: "Discard changes?") { click_on "Back" }

    click_and_wait_for(text: "New task") { click_on "Cancel" }
    assert_field "Title", with: "Unsaved task"

    click_and_wait_for(text: "Discard changes?") { click_on "Back" }
    click_and_wait_for(text: "Tasks") { click_on "Discard" }

    assert_selector "h1", text: "Tasks"
    assert_no_text "Unsaved task"
  end

  test "editing a task updates it in the list" do
    task = Task.create!(title: "Original title", description: "", done: false, user: @user)
    visit root_path
    wait_for_hydration

    click_and_wait_for(text: "Edit task") { click_on task.title }
    fill_in "Title", with: "Updated title"
    click_and_wait_for(text: "Tasks") { click_on "Save changes" }

    assert_text "Updated title"
    assert_no_text "Original title"
  end

  test "deleting a task requires confirmation" do
    task = Task.create!(title: "Delete me", description: "", done: false, user: @user)
    visit root_path
    wait_for_hydration

    click_and_wait_for(text: "Delete \"#{task.title}\"?") { click_on "Delete \"#{task.title}\"" }
    assert_text "Delete me"

    click_on "Delete", exact: true

    assert_no_text "Delete me"
  end
end

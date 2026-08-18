require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "invalid without a title" do
    task = Task.new(title: nil, description: "No title here", user: users(:one))
    assert_not task.valid?
    assert_includes task.errors[:title], "can't be blank"
  end

  test "valid with a title" do
    task = Task.new(title: "Do the thing", user: users(:one))
    assert task.valid?
  end

  test "defaults done to false" do
    task = Task.create!(title: "New task", user: users(:one))
    assert_equal false, task.done
  end

  test "visible_to includes the owner's own tasks and everyone's public tasks" do
    visible = Task.visible_to(users(:one))
    assert_includes visible, tasks(:one)
    assert_includes visible, tasks(:three)
    assert_not_includes visible, Task.create!(title: "Someone else's private task", user: users(:two))
  end
end

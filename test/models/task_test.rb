require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "invalid without a title" do
    task = Task.new(title: nil, description: "No title here")
    assert_not task.valid?
    assert_includes task.errors[:title], "can't be blank"
  end

  test "valid with a title" do
    task = Task.new(title: "Do the thing")
    assert task.valid?
  end

  test "defaults done to false" do
    task = Task.create!(title: "New task")
    assert_equal false, task.done
  end
end

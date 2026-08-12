require "test_helper"

class ExampleJobTest < ActiveJob::TestCase
  test "performs without raising" do
    job = ExampleJob.new
    job.stub(:sleep, nil) do
      assert job.perform("arg1")
    end
  end
end

require "test_helper"

class ApplicationMailerTest < ActionMailer::TestCase
  test "configures a default from address and layout" do
    assert_equal "from@example.com", ApplicationMailer.default[:from]
    assert_equal "mailer", ApplicationMailer._layout
  end
end

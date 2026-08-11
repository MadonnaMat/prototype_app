class ExampleJob < ApplicationJob
  queue_as :default

  def perform(*args)
    Rails.logger.debug "=== Hello from Solid Queue! Processing arguments: #{args.inspect} ==="
    # Simulate work
    sleep 2
    Rails.logger.debug "=== ExampleJob completed successfully! ==="
  end
end

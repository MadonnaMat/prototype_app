require "flog_task"

# Current baseline (app + lib) is ~58; 100 leaves room to grow without being a hair-trigger,
# while still catching a genuine complexity spike (e.g. a new God-method or deeply nested logic).
FlogTask.new(:flog, 100, %w[app lib])

require "flog_task"

# Gates the worst single method's ABC score in app/ + lib/, not a whole-app sum.
# Must be :max_method, not :max_score: FlogTask calls `flog.send(method)` on a
# FlogCLI instance, and FlogCLI (lib/flog_cli.rb) only Forwardable-delegates
# :max_method (returns a [name, score] pair) to the underlying Flog object —
# :max_score exists on Flog itself but isn't delegated, so passing it raises
# NoMethodError. Confirmed against the installed flog-4.9.4 gem source.
# A per-method gate catches a genuine complexity spike in one method regardless
# of overall app size, instead of a shared budget that every new method (however
# simple) eats into. Current worst is ~14.6 (PagesController#task_app_props);
# 25 leaves headroom to grow without being a hair-trigger, while still catching
# a real offender. Check with `bundle exec flog -a app lib`, sorted worst-first.
FlogTask.new(:flog, 25, %w[app lib], :max_method)

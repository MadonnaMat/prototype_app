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

# Restores the whole-codebase complexity budget the per-method gate above
# can't see: many individually-fine methods (each under 25) accumulating
# across files as the app grows. Deliberately uses the per-method *average*
# (total_score / method count), not a raw total-score budget — a raw total
# scales with codebase size, so it would need bumping in every PR that adds
# a feature regardless of complexity (this bit us once already: the original
# 100 threshold, set when the app was much smaller, was already stale at
# ~202 by the time this task was rewritten). The average stays flat as
# ordinary growth adds ordinary-complexity methods, and only rises if new
# code is disproportionately more complex than the existing average.
# Current average is ~4.2; 8 leaves headroom similar to the per-method gate
# above. Check with `bundle exec flog app lib` (no -m; see the "average"
# line). Not wired into bin/ci — ask before adding it there, per CLAUDE.md.
FlogTask.new(:flog_total, 8, %w[app lib], :average)

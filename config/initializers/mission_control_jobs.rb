# Set directly on the MissionControl::Jobs module rather than via
# `config.mission_control.jobs.*` — the engine copies that config into this
# module during its own `config.before_initialize`, which runs before
# config/initializers/*.rb files load, so setting it there would silently
# have no effect.
MissionControl::Jobs.base_controller_class = "MissionControlJobsController"
# Its own HTTP Basic auth is redundant once base_controller_class gates
# access via the session cookie — see MissionControlJobsController.
MissionControl::Jobs.http_basic_auth_enabled = false

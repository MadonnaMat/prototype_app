# Base controller for Mission Control - Jobs' mounted engine (see
# config/routes.rb and config/initializers/mission_control_jobs.rb). The
# engine's own HTTP Basic auth is disabled in favor of this app's existing
# session cookie auth. Authentication#require_authentication only loads
# Current.session — it never halts on its own (ApplicationController skips
# it globally via allow_unauthenticated_access, since the SPA shell handles
# auth client-side) — so this adds the actual gate for this one controller.
class MissionControlJobsController < ApplicationController
  before_action :require_signed_in_user

  private

  def require_signed_in_user
    redirect_to "/login" unless authenticated?
  end
end

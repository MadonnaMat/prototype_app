class ApplicationController < ActionController::Base
  include Authentication
  # This app has no server-rendered HTML auth flow (the SPA shell renders
  # regardless of login state; auth gating happens client-side via routing
  # and server-side via Api::BaseController's token check), so the cookie/
  # redirect-based Authentication#require_authentication before_action is
  # never appropriate here. Skip it globally rather than repeating the skip
  # in every controller.
  allow_unauthenticated_access
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
end
